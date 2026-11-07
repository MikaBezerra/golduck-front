import type { Signal } from '@angular/core';
import type { FormArray, FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { apiError, internals, openDialog } from '../../../../testing/components';
import { aCardExpense, aCreditCard } from '../../../../testing/fixtures';
import { confirmMock, type ConfirmMock, notificationsMock } from '../../../../testing/mocks';
import type { CardExpense } from '../../card-expenses/data-access/card-expense.models';
import { CardImportService } from '../data-access/card-import.service';
import { CardImportManualDialogComponent } from './card-import-manual-dialog.component';

interface Internals {
    readonly form: FormGroup;
    readonly rows: FormArray<FormGroup>;
    readonly resultLines: Signal<string[]>;
    addRow(): void;
    removeRow(index: number): void;
    save(): Promise<void>;
}

const RESULT = {
    import: { id: 'import-1' },
    summary: { created: 1, updated: 0, removed: 0, projected: 2, ignored: 0 },
};

describe('CardImportManualDialogComponent (fatura digitada à mão)', () => {
    const cardImports = { createManual: vi.fn() };
    const notifications = notificationsMock();
    let confirm: ConfirmMock;

    function open(existing: CardExpense[] = [], confirmAnswer = true) {
        cardImports.createManual.mockReset();
        Object.values(notifications).forEach((mock) => mock.mockReset());
        confirm = confirmMock(confirmAnswer);

        const fixture = openDialog(
            CardImportManualDialogComponent,
            { card: aCreditCard({ id: 'card-1', name: 'Roxinho' }), month: '2026-11', existing },
            [
                { provide: CardImportService, useValue: cardImports },
                { provide: NotificationService, useValue: notifications },
                { provide: ConfirmService, useValue: confirm },
            ],
        );
        const imported = vi.fn();
        fixture.componentInstance.imported.subscribe(imported);

        return { dialog: internals<Internals>(fixture), imported };
    }

    function fill(row: FormGroup, value: Record<string, unknown>): void {
        row.patchValue(value);
    }

    it('sem despesas no mês, começa com uma linha vazia no dia 1º do mês', () => {
        const { dialog } = open();

        expect(dialog.rows.length).toBe(1);
        expect(dialog.rows.at(0).getRawValue()).toMatchObject({ date: '2026-11-01', description: '', amount: null });
    });

    it('com despesas no mês, começa com elas (descrição original, valor e parcela)', () => {
        const { dialog } = open([
            aCardExpense({
                transactionDate: '2026-10-20',
                originalDescription: 'LOJA X',
                amount: '300.00',
                installment: { number: 2, total: 5 },
                cardLastDigits: '1234',
            }),
        ]);

        expect(dialog.rows.at(0).getRawValue()).toEqual({
            date: '2026-10-20',
            description: 'LOJA X',
            amount: 300,
            installmentNumber: 2,
            installmentTotal: 5,
            cardLastDigits: '1234',
        });
    });

    it('linha nova repete a data da anterior; dá para remover linhas', () => {
        const { dialog } = open();
        dialog.rows.at(0).patchValue({ date: '2026-10-15' });

        dialog.addRow();
        expect(dialog.rows.at(1).get('date')?.value).toBe('2026-10-15');

        dialog.removeRow(0);
        expect(dialog.rows.length).toBe(1);
    });

    it('parcela exige número e total juntos, e o número não passa do total', () => {
        const { dialog } = open();
        const row = dialog.rows.at(0);
        fill(row, { description: 'Loja', amount: 10 });

        fill(row, { installmentNumber: 2, installmentTotal: null });
        expect(row.getError('installment')).toBe('Informe a parcela e o total, ou deixe os dois vazios');

        fill(row, { installmentNumber: 4, installmentTotal: 3 });
        expect(row.getError('installment')).toBe('A parcela não pode ser maior que o total');

        fill(row, { installmentNumber: 3, installmentTotal: 3 });
        expect(row.valid).toBe(true);
    });

    it('final do cartão precisa de 4 dígitos (ou vazio)', () => {
        const { dialog } = open();
        const row = dialog.rows.at(0);
        fill(row, { description: 'Loja', amount: 10 });

        fill(row, { cardLastDigits: '12' });
        expect(row.get('cardLastDigits')?.invalid).toBe(true);

        fill(row, { cardLastDigits: '' });
        expect(row.valid).toBe(true);
    });

    it('envia os lançamentos no formato da API e mostra o resultado', async () => {
        const { dialog, imported } = open();
        cardImports.createManual.mockReturnValue(of(RESULT));
        fill(dialog.rows.at(0), {
            date: '2026-10-10',
            description: '  Padaria ',
            amount: 12.5,
            installmentNumber: 1,
            installmentTotal: 3,
            cardLastDigits: '',
        });

        await dialog.save();

        expect(cardImports.createManual).toHaveBeenCalledWith({
            cardId: 'card-1',
            month: '2026-11',
            transactions: [
                {
                    date: '2026-10-10',
                    description: 'Padaria',
                    amount: '12.50',
                    installment: { number: 1, total: 3 },
                    cardLastDigits: null,
                },
            ],
        });
        expect(imported).toHaveBeenCalledWith(RESULT);
        expect(dialog.resultLines()).toContain('1 compra nova');
    });

    it('não envia com linha incompleta', async () => {
        const { dialog } = open();

        await dialog.save();

        expect(cardImports.createManual).not.toHaveBeenCalled();
        expect(dialog.rows.at(0).get('description')?.touched).toBe(true);
    });

    it('fatura sem nenhuma linha pede confirmação antes de apagar tudo do mês', async () => {
        const cancelled = open([], false);
        cancelled.dialog.removeRow(0);
        await cancelled.dialog.save();
        expect(confirm.danger).toHaveBeenCalledWith(expect.objectContaining({ acceptLabel: 'Remover tudo' }));
        expect(cardImports.createManual).not.toHaveBeenCalled();

        const accepted = open([], true);
        accepted.dialog.removeRow(0);
        cardImports.createManual.mockReturnValue(of(RESULT));
        await accepted.dialog.save();
        expect(cardImports.createManual).toHaveBeenCalledWith({ cardId: 'card-1', month: '2026-11', transactions: [] });
    });

    it('erro de validação do back vai para a linha certa', async () => {
        const { dialog } = open();
        fill(dialog.rows.at(0), { description: 'Loja', amount: 10 });
        dialog.addRow();
        fill(dialog.rows.at(1), { description: 'Outra', amount: 20 });
        cardImports.createManual.mockReturnValue(
            apiError(400, 'VALIDATION_ERROR', 'Inválido', [
                { field: 'transactions[1].amount', code: 'number.max', message: 'Valor alto demais' },
            ]),
        );

        await dialog.save();

        expect(dialog.rows.at(1).get('amount')?.getError('server')).toBe('Valor alto demais');
        expect(notifications.error).not.toHaveBeenCalled();
    });
});
