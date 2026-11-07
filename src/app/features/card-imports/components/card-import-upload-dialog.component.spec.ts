import type { Signal } from '@angular/core';
import type { FormArray, FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { apiError, internals, openDialog } from '../../../../testing/components';
import { aCategory, aCreditCard, aPerson } from '../../../../testing/fixtures';
import { lookupsWith } from '../../../../testing/lookups';
import { notificationsMock } from '../../../../testing/mocks';
import type { CardBank, CreditCard } from '../../credit-cards/data-access/credit-card.models';
import { ExpenseLookupsService } from '../../manual-expenses/data-access/expense-lookups.service';
import type { CardImportPreview, CardImportPreviewTransaction } from '../data-access/card-import.models';
import { CardImportService } from '../data-access/card-import.service';
import { CardImportUploadDialogComponent } from './card-import-upload-dialog.component';

interface Internals {
    readonly step: Signal<'file' | 'review' | 'done'>;
    readonly form: FormGroup;
    readonly rows: FormArray<FormGroup>;
    readonly fileError: Signal<string | null>;
    readonly reviewError: Signal<{ message: string; repreview: boolean } | null>;
    readonly asksPassword: Signal<boolean>;
    readonly header: Signal<string>;
    readonly resultLines: Signal<string[]>;
    onFileChange(event: Event): void;
    runPreview(): void;
    backToFile(): void;
    save(): void;
}

function transaction(overrides: Partial<CardImportPreviewTransaction> = {}): CardImportPreviewTransaction {
    return {
        key: 'k1',
        status: 'new',
        transactionDate: '2026-10-10',
        description: 'MERCADO',
        amount: '100.00',
        installment: null,
        holderName: null,
        cardLastDigits: null,
        nickname: null,
        categoryId: 'c-outros',
        personId: null,
        projectedCount: 0,
        excluded: false,
        askExclusion: false,
        ...overrides,
    };
}

function previewWith(transactions: CardImportPreviewTransaction[]): CardImportPreview {
    return {
        cardId: 'card-1',
        month: '2026-11',
        fileName: 'fatura.csv',
        transactions,
        removed: [],
        summary: { created: transactions.length, updated: 0, removed: 0, projected: 0, ignored: 0 },
    };
}

const RESULT = {
    import: { id: 'import-1', month: '2026-11' },
    summary: { created: 2, updated: 0, removed: 0, projected: 0, ignored: 0 },
};

function chooseFile(dialog: Internals, file: File): void {
    dialog.onFileChange({ target: { files: [file] } } as unknown as Event);
}

function csv(name = 'fatura.csv', content = 'data,descricao,valor'): File {
    return new File([content], name, { type: 'text/csv' });
}

describe('CardImportUploadDialogComponent (enviar fatura: arquivo → revisão → salvo)', () => {
    const cardImports = { preview: vi.fn(), save: vi.fn() };
    const notifications = notificationsMock();

    function open(card: CreditCard = aCreditCard({ id: 'card-1', bank: 'NUBANK' })) {
        cardImports.preview.mockReset();
        cardImports.save.mockReset();
        Object.values(notifications).forEach((mock) => mock.mockReset());

        const fixture = openDialog(CardImportUploadDialogComponent, { card, defaultMonth: '2026-11' }, [
            { provide: CardImportService, useValue: cardImports },
            { provide: NotificationService, useValue: notifications },
            {
                provide: ExpenseLookupsService,
                useValue: lookupsWith([aCategory({ id: 'c-outros', isDefault: true })], [aPerson({ id: 'p-ana' })]),
            },
        ]);
        const imported = vi.fn();
        fixture.componentInstance.imported.subscribe(imported);

        return { fixture, dialog: internals<Internals>(fixture), imported };
    }

    describe('etapa do arquivo', () => {
        it('confere extensão, arquivo vazio e tamanho antes de enviar', () => {
            const { dialog } = open();

            chooseFile(dialog, new File(['x'], 'fatura.pdf'));
            expect(dialog.fileError()).toBe('Envie o arquivo .csv exportado pelo banco deste cartão.');

            chooseFile(dialog, new File([], 'fatura.csv'));
            expect(dialog.fileError()).toBe('O arquivo está vazio.');

            chooseFile(dialog, new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'fatura.csv'));
            expect(dialog.fileError()).toBe('O arquivo da fatura deve ter no máximo 2 MB.');

            chooseFile(dialog, csv());
            expect(dialog.fileError()).toBeNull();
        });

        it('sem arquivo, não chama o back e pede o arquivo', () => {
            const { dialog } = open();

            dialog.runPreview();

            expect(cardImports.preview).not.toHaveBeenCalled();
            expect(dialog.fileError()).toBe('Escolha o arquivo da fatura');
        });

        it('só pede senha para bancos com PDF protegido (Neon)', () => {
            expect(open(aCreditCard({ bank: 'NUBANK' })).dialog.asksPassword()).toBe(false);

            const neon = open(aCreditCard({ id: 'card-n', bank: 'NEON' as CardBank }));
            cardImports.preview.mockReturnValue(of(previewWith([])));
            chooseFile(neon.dialog, new File(['%PDF'], 'fatura.pdf'));
            neon.dialog.form.patchValue({ password: '1234' });
            neon.dialog.runPreview();

            expect(neon.dialog.asksPassword()).toBe(true);
            expect(cardImports.preview).toHaveBeenCalledWith(expect.objectContaining({ password: '1234' }));
        });

        it('senha errada aparece no campo da senha; erro de arquivo aparece no arquivo', () => {
            const { dialog } = open(aCreditCard({ bank: 'NEON' as CardBank }));
            chooseFile(dialog, new File(['%PDF'], 'fatura.pdf'));

            cardImports.preview.mockReturnValue(apiError(400, 'IMPORT_FILE_PASSWORD_INVALID', 'Senha inválida'));
            dialog.runPreview();
            expect(dialog.form.get('password')?.getError('server')).toBe('Senha incorreta ou não informada.');

            dialog.form.patchValue({ password: 'outra' });
            cardImports.preview.mockReturnValue(apiError(400, 'IMPORT_UNSUPPORTED_FORMAT', 'Formato não reconhecido'));
            dialog.runPreview();
            expect(dialog.fileError()).toBe('Formato não reconhecido');
            expect(dialog.step()).toBe('file');
        });
    });

    describe('revisão e salvamento', () => {
        function reviewing(transactions: CardImportPreviewTransaction[]) {
            const opened = open();
            cardImports.preview.mockReturnValue(of(previewWith(transactions)));
            chooseFile(opened.dialog, csv());
            opened.dialog.runPreview();

            return opened;
        }

        it('a pré-visualização leva à revisão, com uma linha por compra e a sugestão do back', () => {
            const { dialog } = reviewing([transaction({ key: 'k1', nickname: 'Feira', categoryId: 'c-outros' })]);

            expect(cardImports.preview).toHaveBeenCalledWith({
                cardId: 'card-1',
                month: '2026-11',
                file: expect.any(File) as File,
                password: undefined,
            });
            expect(dialog.step()).toBe('review');
            expect(dialog.header()).toBe('Revisar fatura de Novembro de 2026');
            expect(dialog.rows.at(0).getRawValue()).toMatchObject({
                nickname: 'Feira',
                categoryId: 'c-outros',
                personId: null,
                exclude: false,
            });
        });

        it('salva mandando só as compras alteradas e as decisões de exclusão', () => {
            const { dialog, imported } = reviewing([
                transaction({ key: 'igual' }),
                transaction({ key: 'mudou' }),
                transaction({ key: 'excluir' }),
                transaction({ key: 'restaurar', excluded: true }),
            ]);
            cardImports.save.mockReturnValue(of(RESULT));

            dialog.rows.at(1).patchValue({ nickname: ' Padaria ', personId: 'p-ana' });
            dialog.rows.at(2).patchValue({ exclude: true, scope: 'forward' });
            dialog.rows.at(3).patchValue({ exclude: false });
            dialog.save();

            expect(cardImports.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    overrides: [{ key: 'mudou', nickname: 'Padaria', categoryId: 'c-outros', personId: 'p-ana' }],
                    exclusions: [
                        { key: 'excluir', action: 'exclude', scope: 'forward', remember: false },
                        { key: 'restaurar', action: 'restore', scope: 'all', remember: false },
                    ],
                }),
            );
            expect(dialog.step()).toBe('done');
            expect(dialog.header()).toBe('Fatura salva');
            expect(dialog.resultLines()).toContain('2 compras novas');
            expect(imported).toHaveBeenCalledWith(RESULT);
        });

        it('compra já excluída com "não perguntar de novo" é enviada para lembrar a decisão', () => {
            const { dialog } = reviewing([transaction({ key: 'k1', excluded: true })]);
            cardImports.save.mockReturnValue(of(RESULT));

            dialog.rows.at(0).patchValue({ remember: true });
            dialog.save();

            expect(cardImports.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    exclusions: [{ key: 'k1', action: 'exclude', scope: 'all', remember: true }],
                }),
            );
        });

        it('erro de revisão fica na revisão; chave desconhecida pede nova pré-visualização', () => {
            const { dialog } = reviewing([transaction()]);

            cardImports.save.mockReturnValue(
                apiError(400, 'IMPORT_OVERRIDE_UNKNOWN_KEY', 'A fatura mudou desde a pré-visualização'),
            );
            dialog.save();

            expect(dialog.step()).toBe('review');
            expect(dialog.reviewError()).toEqual({
                message: 'A fatura mudou desde a pré-visualização',
                repreview: true,
            });
        });

        it('erro de validação de uma escolha vai para a linha da compra certa', () => {
            const { dialog } = reviewing([transaction({ key: 'a' }), transaction({ key: 'b' })]);
            dialog.rows.at(1).patchValue({ nickname: 'Apelido' });
            cardImports.save.mockReturnValue(
                apiError(400, 'VALIDATION_ERROR', 'Inválido', [
                    { field: 'overrides[0].nickname', code: 'string.max', message: 'Apelido longo demais' },
                ]),
            );

            dialog.save();

            expect(dialog.rows.at(1).get('nickname')?.getError('server')).toBe('Apelido longo demais');
            expect(notifications.error).not.toHaveBeenCalled();
        });

        it('voltar ao arquivo mantém a escolha e limpa o erro de revisão', () => {
            const { dialog } = reviewing([transaction()]);
            cardImports.save.mockReturnValue(apiError(400, 'CARD_EXPENSE_INACTIVE_CATEGORY', 'Categoria desativada'));
            dialog.save();

            dialog.backToFile();

            expect(dialog.step()).toBe('file');
            expect(dialog.reviewError()).toBeNull();
        });
    });
});
