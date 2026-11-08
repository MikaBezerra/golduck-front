import type { Signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { apiError, internals, openDialog } from '../../../../testing/components';
import { notificationsMock } from '../../../../testing/mocks';
import type {
    SummaryDispatch,
    SummaryDispatchItem,
    SummaryDispatchPreview,
    SummaryDispatchRecipient,
} from '../data-access/summary-dispatch.models';
import { SummaryDispatchService } from '../data-access/summary-dispatch.service';
import { SummaryDispatchDialogComponent } from './summary-dispatch-dialog.component';

interface Internals {
    readonly preview: Signal<SummaryDispatchPreview | null>;
    readonly loadFailed: Signal<boolean>;
    readonly sending: Signal<boolean>;
    readonly items: Signal<readonly SummaryDispatchItem[]>;
    readonly failedIds: Signal<string[]>;
    readonly canSend: Signal<boolean>;
    readonly email: Signal<{ name: string; subject: string } | null>;
    loadPreview(): void;
    send(): void;
    retryFailed(): void;
    viewEmail(recipient: SummaryDispatchRecipient): void;
    closeEmail(): void;
}

const ANA: SummaryDispatchRecipient = { personId: 'p-ana', name: 'Ana', hasEmail: true, recipient: 'an•••@gmail.com' };
const BRUNO: SummaryDispatchRecipient = { personId: 'p-bruno', name: 'Bruno', hasEmail: false, recipient: null };

function aPreview(overrides: Partial<SummaryDispatchPreview> = {}): SummaryDispatchPreview {
    return { month: '2026-11', enabled: true, recipients: [ANA, BRUNO], lastDispatch: null, ...overrides };
}

function anItem(overrides: Partial<SummaryDispatchItem> = {}): SummaryDispatchItem {
    return {
        personId: 'p-ana',
        name: 'Ana',
        status: 'SENT',
        recipient: 'an•••@gmail.com',
        errorCode: null,
        message: null,
        ...overrides,
    };
}

function aDispatch(items: SummaryDispatchItem[], counts: SummaryDispatch['counts']): SummaryDispatch {
    return {
        id: 'd-1',
        month: '2026-11',
        channel: 'EMAIL',
        status: 'DONE',
        startedAt: '2026-11-08T12:30:00.000Z',
        finishedAt: '2026-11-08T12:30:05.000Z',
        counts,
        items,
    };
}

const FAILED_ANA = anItem({
    status: 'FAILED',
    errorCode: 'MAIL_RECIPIENT_REJECTED',
    message: 'O servidor de e-mail recusou o endereço de Ana. Confira o e-mail cadastrado.',
});
const SKIPPED_BRUNO = anItem({
    personId: 'p-bruno',
    name: 'Bruno',
    status: 'SKIPPED_NO_EMAIL',
    recipient: null,
    message: 'Bruno não tem e-mail cadastrado.',
});

describe('SummaryDispatchDialogComponent (enviar o resumo do mês por e-mail)', () => {
    const service = { preview: vi.fn(), dispatch: vi.fn(), email: vi.fn() };
    const notifications = notificationsMock();
    let keys: number;

    function open(preview: SummaryDispatchPreview = aPreview()) {
        Object.values(service).forEach((mock) => mock.mockReset());
        Object.values(notifications).forEach((mock) => mock.mockReset());
        keys = 0;
        vi.spyOn(crypto, 'randomUUID').mockImplementation(
            () => `00000000-0000-4000-8000-00000000000${++keys}` as never,
        );
        service.preview.mockReturnValue(of(preview));

        const fixture = openDialog(SummaryDispatchDialogComponent, { month: '2026-11' }, [
            provideRouter([]),
            { provide: SummaryDispatchService, useValue: service },
            { provide: NotificationService, useValue: notifications },
        ]);
        const dispatched = vi.fn();
        fixture.componentInstance.dispatched.subscribe(dispatched);
        fixture.detectChanges();

        return {
            fixture,
            dialog: internals<Internals>(fixture),
            dispatched,
            text: () => fixture.nativeElement.ownerDocument.body.textContent as string,
        };
    }

    afterEach(() => vi.restoreAllMocks());

    it('ao abrir, busca quem vai receber e mostra cada pessoa (com e sem e-mail)', () => {
        const { dialog, text } = open();

        expect(service.preview).toHaveBeenCalledWith('2026-11');
        expect(dialog.preview()).toEqual(aPreview());
        expect(text()).toContain('an•••@gmail.com');
        expect(text()).toContain('sem e-mail: não vai receber');
        expect(text()).toContain('Cadastrar em Pessoas');
        expect(dialog.canSend()).toBe(true);
    });

    it('com envio anterior, pergunta se envia de novo', () => {
        const last = aDispatch([anItem()], { sent: 1, skipped: 0, failed: 0 });
        const { text } = open(aPreview({ lastDispatch: last }));

        expect(text()).toMatch(/Último envio em 08\/11 às \d{2}:30\. Enviar de novo\?/);
    });

    it('não deixa enviar com o e-mail desligado ou sem ninguém com e-mail', () => {
        expect(open(aPreview({ enabled: false })).dialog.canSend()).toBe(false);
        expect(open(aPreview({ recipients: [BRUNO] })).dialog.canSend()).toBe(false);
    });

    it('envia com a chave gerada ao abrir, avisa "X de Y enviados" e mostra cada pessoa', () => {
        const { dialog, dispatched, text, fixture } = open();
        const result = aDispatch([anItem(), SKIPPED_BRUNO], { sent: 1, skipped: 1, failed: 0 });
        service.dispatch.mockReturnValue(of(result));

        dialog.send();
        fixture.detectChanges();

        expect(service.dispatch).toHaveBeenCalledWith('2026-11', '00000000-0000-4000-8000-000000000001');
        expect(notifications.info).toHaveBeenCalledWith('1 de 2 enviados.');
        expect(dispatched).toHaveBeenCalledWith(result);
        expect(dialog.items()).toEqual(result.items);
        expect(text()).toContain('Bruno não tem e-mail cadastrado.');
        expect(dialog.failedIds()).toEqual([]);
    });

    it('todos enviados: aviso de sucesso', () => {
        const { dialog } = open();
        service.dispatch.mockReturnValue(of(aDispatch([anItem()], { sent: 1, skipped: 0, failed: 0 })));

        dialog.send();

        expect(notifications.success).toHaveBeenCalledWith('1 de 1 enviados.');
    });

    it('ignora cliques enquanto envia', () => {
        const { dialog } = open();
        const pending = new Subject<SummaryDispatch>();
        service.dispatch.mockReturnValue(pending);

        dialog.send();
        dialog.send();

        expect(dialog.sending()).toBe(true);
        expect(dialog.canSend()).toBe(false);
        expect(service.dispatch).toHaveBeenCalledTimes(1);

        pending.next(aDispatch([anItem()], { sent: 1, skipped: 0, failed: 0 }));
        pending.complete();

        expect(dialog.sending()).toBe(false);
    });

    it('depois de um erro, repete com a mesma chave e mostra a mensagem do back', () => {
        const { dialog } = open();
        service.dispatch.mockReturnValueOnce(
            apiError(409, 'SUMMARY_DISPATCH_IN_PROGRESS', 'Já existe um envio deste mês em andamento.'),
        );

        dialog.send();

        expect(notifications.error).toHaveBeenCalledWith(
            expect.objectContaining({ code: 'SUMMARY_DISPATCH_IN_PROGRESS' }),
        );
        expect(dialog.sending()).toBe(false);

        service.dispatch.mockReturnValueOnce(throwError(() => new Error('rede')));
        dialog.send();

        expect(service.dispatch.mock.calls.map((call) => call[1])).toEqual([
            '00000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-000000000001',
        ]);
    });

    it('reenvia só para quem falhou, com uma chave nova, e atualiza só essas pessoas', () => {
        const { dialog } = open();
        service.dispatch.mockReturnValueOnce(
            of(aDispatch([FAILED_ANA, SKIPPED_BRUNO], { sent: 0, skipped: 1, failed: 1 })),
        );
        dialog.send();

        expect(dialog.failedIds()).toEqual(['p-ana']);

        service.dispatch.mockReturnValueOnce(of(aDispatch([anItem()], { sent: 1, skipped: 0, failed: 0 })));
        dialog.retryFailed();

        const [, retryKey, personIds] = service.dispatch.mock.calls[1];
        expect(personIds).toEqual(['p-ana']);
        expect(retryKey).not.toBe(service.dispatch.mock.calls[0][1]);
        expect(dialog.items().map((item) => item.status)).toEqual(['SENT', 'SKIPPED_NO_EMAIL']);
        expect(dialog.failedIds()).toEqual([]);
        expect(notifications.success).toHaveBeenCalledWith('1 de 1 enviados.');
    });

    it('sem falhas, "tentar de novo" não faz nada', () => {
        const { dialog } = open();

        dialog.retryFailed();

        expect(service.dispatch).not.toHaveBeenCalled();
    });

    it('mostra o e-mail de uma pessoa e volta para a lista', () => {
        const { dialog, fixture } = open();
        service.email.mockReturnValue(
            of({
                personId: 'p-ana',
                recipient: 'an•••@gmail.com',
                subject: 'Golduck · Resumo',
                html: '<p>Oi</p>',
                text: 'Oi',
            }),
        );

        dialog.viewEmail(ANA);
        fixture.detectChanges();

        expect(service.email).toHaveBeenCalledWith('2026-11', 'p-ana');
        expect(dialog.email()).toEqual(expect.objectContaining({ name: 'Ana', subject: 'Golduck · Resumo' }));
        const iframe = fixture.nativeElement.ownerDocument.querySelector('iframe') as HTMLIFrameElement;
        expect(iframe.getAttribute('sandbox')).toBe('');

        dialog.closeEmail();
        expect(dialog.email()).toBeNull();
    });

    it('erro ao buscar o e-mail: avisa', () => {
        const { dialog } = open();
        service.email.mockReturnValue(throwError(() => new Error('falhou')));

        dialog.viewEmail(ANA);

        expect(notifications.error).toHaveBeenCalled();
        expect(dialog.email()).toBeNull();
    });

    it('erro na prévia: avisa e deixa tentar de novo', () => {
        const { dialog } = open();
        service.preview.mockReturnValueOnce(throwError(() => new Error('falhou')));

        dialog.loadPreview();

        expect(dialog.loadFailed()).toBe(true);
        expect(notifications.error).toHaveBeenCalled();

        dialog.loadPreview();
        expect(dialog.loadFailed()).toBe(false);
    });
});
