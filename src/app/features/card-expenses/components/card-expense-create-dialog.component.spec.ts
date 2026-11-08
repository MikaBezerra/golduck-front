import type { Signal } from '@angular/core';
import type { FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { apiError, internals, openDialog } from '../../../../testing/components';
import { aCardExpense, aCategory, aCreditCard, aPerson } from '../../../../testing/fixtures';
import { lookupsWith } from '../../../../testing/lookups';
import { notificationsMock } from '../../../../testing/mocks';
import { ExpenseLookupsService } from '../../manual-expenses/data-access/expense-lookups.service';
import { CardExpenseService } from '../data-access/card-expense.service';
import { CardExpenseCreateDialogComponent } from './card-expense-create-dialog.component';

interface Internals {
    readonly form: FormGroup;
    readonly defaultCategoryName: Signal<string>;
    save(): void;
}

describe('CardExpenseCreateDialogComponent', () => {
    const cardExpenses = { create: vi.fn() };
    const notifications = notificationsMock();
    const lookups = lookupsWith(
        [aCategory({ id: 'c-outros', name: 'Outros', isDefault: true }), aCategory({ id: 'c-casa', name: 'Casa' })],
        [aPerson({ id: 'p-ana', name: 'Ana' })],
    );

    function open(month = '2026-11') {
        cardExpenses.create.mockReset();
        Object.values(notifications).forEach((mock) => mock.mockReset());

        const fixture = openDialog(CardExpenseCreateDialogComponent, { card: aCreditCard({ id: 'card-1' }), month }, [
            { provide: CardExpenseService, useValue: cardExpenses },
            { provide: NotificationService, useValue: notifications },
            { provide: ExpenseLookupsService, useValue: lookups },
        ]);
        const created = vi.fn();
        fixture.componentInstance.created.subscribe(created);

        return { fixture, dialog: internals<Internals>(fixture), created };
    }

    function fill(dialog: Internals, extra: Record<string, unknown> = {}): void {
        dialog.form.patchValue({
            date: '2026-10-20',
            description: ' Padaria ',
            amount: 30,
            personId: 'SHARED',
            ...extra,
        });
    }

    it('abre na fatura da tela, com a categoria padrão como sugestão', () => {
        const { dialog } = open('2026-12');

        expect(dialog.form.getRawValue()).toMatchObject({ month: new Date(2026, 11, 1), date: '', amount: null });
        expect(dialog.defaultCategoryName()).toBe('Outros');
    });

    it('exige data, descrição, valor e a pessoa (ou Compartilhada)', () => {
        const { dialog } = open();

        dialog.save();

        expect(cardExpenses.create).not.toHaveBeenCalled();
        expect(dialog.form.get('date')?.hasError('required')).toBe(true);
        expect(dialog.form.get('description')?.hasError('required')).toBe(true);
        expect(dialog.form.get('amount')?.hasError('required')).toBe(true);
        expect(dialog.form.get('personId')?.hasError('required')).toBe(true);
    });

    it('compra à vista: envia só o preenchido, com o valor em texto', () => {
        const { fixture, dialog, created } = open();
        cardExpenses.create.mockReturnValue(of([aCardExpense({ origin: 'MANUAL' })]));

        fill(dialog);
        dialog.save();

        expect(cardExpenses.create).toHaveBeenCalledWith({
            cardId: 'card-1',
            month: '2026-11',
            date: '2026-10-20',
            description: 'Padaria',
            amount: '30.00',
            split: 'SHARED',
        });
        expect(notifications.success).toHaveBeenCalledWith('Compra adicionada em Novembro de 2026.');
        expect(created).toHaveBeenCalledWith('2026-11');
        expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('parcelada, com apelido, categoria e pessoa: avisa as parcelas seguintes', () => {
        const { dialog } = open();
        cardExpenses.create.mockReturnValue(of([aCardExpense(), aCardExpense(), aCardExpense()]));

        fill(dialog, {
            installmentNumber: 1,
            installmentTotal: 3,
            nickname: ' Pão ',
            categoryId: 'c-casa',
            personId: 'p-ana',
            month: new Date(2026, 11, 1),
        });
        dialog.save();

        expect(cardExpenses.create).toHaveBeenCalledWith(
            expect.objectContaining({
                month: '2026-12',
                installment: { number: 1, total: 3 },
                nickname: 'Pão',
                categoryId: 'c-casa',
                split: 'PERSONAL',
                personId: 'p-ana',
            }),
        );
        expect(notifications.success).toHaveBeenCalledWith(
            'Compra adicionada em Dezembro de 2026, com 2 parcelas seguintes.',
        );
    });

    it('avisa no singular quando há uma parcela seguinte', () => {
        const { dialog } = open();
        cardExpenses.create.mockReturnValue(of([aCardExpense(), aCardExpense()]));

        fill(dialog, { installmentNumber: 1, installmentTotal: 2 });
        dialog.save();

        expect(notifications.success).toHaveBeenCalledWith(
            'Compra adicionada em Novembro de 2026, com 1 parcela seguinte.',
        );
    });

    it('parcela pela metade ou maior que o total não é enviada', () => {
        const { dialog } = open();

        fill(dialog, { installmentNumber: 2 });
        dialog.save();
        expect(dialog.form.hasError('installment')).toBe(true);

        dialog.form.patchValue({ installmentNumber: 4, installmentTotal: 3 });
        dialog.save();
        expect(dialog.form.getError('installment')).toBe('A parcela não pode ser maior que o total');
        expect(cardExpenses.create).not.toHaveBeenCalled();
    });

    it('erros do back vão para o campo certo ou viram aviso', () => {
        const { dialog } = open();
        fill(dialog, { categoryId: 'c-casa', personId: 'p-ana', installmentNumber: 1, installmentTotal: 2 });

        cardExpenses.create.mockReturnValue(apiError(409, 'CARD_EXPENSE_INACTIVE_CATEGORY', 'Categoria inativa'));
        dialog.save();
        expect(dialog.form.get('categoryId')?.getError('server')).toBe('Categoria inativa');

        dialog.form.patchValue({ categoryId: null });
        cardExpenses.create.mockReturnValue(apiError(409, 'CARD_EXPENSE_INACTIVE_PERSON', 'Pessoa inativa'));
        dialog.save();
        expect(dialog.form.get('personId')?.getError('server')).toBe('Pessoa inativa');

        dialog.form.patchValue({ personId: 'SHARED' });
        cardExpenses.create.mockReturnValue(apiError(422, 'CARD_EXPENSE_INSTALLMENT_INVALID', 'Parcela inválida'));
        dialog.save();
        expect(dialog.form.get('installmentNumber')?.getError('server')).toBe('Parcela inválida');

        dialog.form.patchValue({ installmentNumber: null, installmentTotal: null });
        cardExpenses.create.mockReturnValue(
            apiError(400, 'VALIDATION_ERROR', 'Inválido', [
                { field: 'description', code: 'string.max', message: 'Longa demais' },
            ]),
        );
        dialog.save();
        expect(dialog.form.get('description')?.getError('server')).toBe('Longa demais');

        dialog.form.patchValue({ description: 'Outra' });
        cardExpenses.create.mockReturnValue(apiError(404, 'CREDIT_CARD_NOT_FOUND', 'Cartão não encontrado'));
        dialog.save();
        expect(notifications.error).toHaveBeenCalled();
    });
});
