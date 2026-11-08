import type { FormControl } from '@angular/forms';
import { of } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { apiError, internals, openDialog } from '../../../../testing/components';
import { aCardBill, aSyncedCreditCard } from '../../../../testing/fixtures';
import { notificationsMock } from '../../../../testing/mocks';
import type { CreditCardBill } from '../data-access/credit-card.models';
import { CreditCardService } from '../data-access/credit-card.service';
import { CreditCardBillDialogComponent } from './credit-card-bill-dialog.component';

interface Internals {
    readonly date: FormControl<string>;
    save(): void;
    reset(): void;
}

describe('CreditCardBillDialogComponent', () => {
    const creditCards = { updateBill: vi.fn() };
    const notifications = notificationsMock();

    function open(bill: CreditCardBill | null = aCardBill()) {
        creditCards.updateBill.mockReset();
        Object.values(notifications).forEach((mock) => mock.mockReset());

        const fixture = openDialog(CreditCardBillDialogComponent, { card: aSyncedCreditCard({ id: 'card-1' }), bill }, [
            { provide: CreditCardService, useValue: creditCards },
            { provide: NotificationService, useValue: notifications },
        ]);
        const saved = vi.fn();
        fixture.componentInstance.saved.subscribe(saved);
        const text = (): string => (fixture.nativeElement as HTMLElement).ownerDocument.body.textContent ?? '';

        return { fixture, dialog: internals<Internals>(fixture), saved, text };
    }

    it('abre com o melhor dia atual e o intervalo aceito', () => {
        const { dialog, text } = open();

        expect(dialog.date.value).toBe('2026-10-25');
        expect(text()).toContain('Entre 01/10/2026 e 30/11/2026');
    });

    it('com ajuste do usuário, abre com o ajuste', () => {
        const { dialog } = open(aCardBill({ source: 'user', userBestPurchaseDate: '2026-10-23' }));

        expect(dialog.date.value).toBe('2026-10-23');
    });

    it('quando o banco já informou o fechamento, deixa isso claro', () => {
        const { text } = open(aCardBill({ source: 'bank', closingDate: '2026-10-22' }));

        expect(text()).toContain('O banco já informou o fechamento desta fatura (22/10/2026)');
    });

    it('salva o melhor dia com PUT e avisa a página para sincronizar', () => {
        const { fixture, dialog, saved } = open();
        const updated = aCardBill({ source: 'user', userBestPurchaseDate: '2026-10-23' });
        creditCards.updateBill.mockReturnValue(of(updated));

        dialog.date.setValue('2026-10-23');
        dialog.save();

        expect(creditCards.updateBill).toHaveBeenCalledWith('card-1', '2026-11', { bestPurchaseDate: '2026-10-23' });
        expect(notifications.success).toHaveBeenCalledWith('Melhor dia da fatura de Novembro de 2026 ajustado.');
        expect(saved).toHaveBeenCalledWith(updated);
        expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('"Voltar ao padrão" envia null', () => {
        const { dialog } = open(aCardBill({ source: 'user', userBestPurchaseDate: '2026-10-23' }));
        creditCards.updateBill.mockReturnValue(of(aCardBill()));

        dialog.reset();

        expect(creditCards.updateBill).toHaveBeenCalledWith('card-1', '2026-11', { bestPurchaseDate: null });
        expect(notifications.success).toHaveBeenCalledWith('A fatura de Novembro de 2026 voltou ao melhor dia padrão.');
    });

    it('data vazia ou fora do intervalo não é enviada', () => {
        const { dialog } = open();

        dialog.date.setValue('');
        dialog.save();
        expect(dialog.date.hasError('required')).toBe(true);

        dialog.date.setValue('2026-09-30');
        dialog.save();
        expect(dialog.date.getError('server')).toBe('Escolha uma data entre 01/10/2026 e 30/11/2026.');
        expect(creditCards.updateBill).not.toHaveBeenCalled();
    });

    it('erro de intervalo do back vai para o campo; os outros viram aviso', () => {
        const { dialog } = open();

        creditCards.updateBill.mockReturnValue(
            apiError(422, 'CREDIT_CARD_BILL_DATE_OUT_OF_RANGE', 'Fora do intervalo'),
        );
        dialog.save();
        expect(dialog.date.getError('server')).toBe('Fora do intervalo');

        dialog.date.setValue('2026-10-24');
        creditCards.updateBill.mockReturnValue(
            apiError(409, 'CREDIT_CARD_BILLING_NOT_CONFIGURED', 'Informe o vencimento'),
        );
        dialog.save();
        expect(notifications.error).toHaveBeenCalled();
    });

    it('sem fatura, não envia nada', () => {
        const { dialog } = open(null);

        dialog.reset();

        expect(creditCards.updateBill).not.toHaveBeenCalled();
    });
});
