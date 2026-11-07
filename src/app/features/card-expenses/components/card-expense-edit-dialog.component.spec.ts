import type { Signal } from '@angular/core';
import type { FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { apiError, internals, openDialog } from '../../../../testing/components';
import { aCardExpense, aCategory, aPerson } from '../../../../testing/fixtures';
import { lookupsWith } from '../../../../testing/lookups';
import { notificationsMock } from '../../../../testing/mocks';
import { ExpenseLookupsService } from '../../manual-expenses/data-access/expense-lookups.service';
import type { CardExpense } from '../data-access/card-expense.models';
import { CardExpenseService } from '../data-access/card-expense.service';
import { CardExpenseEditDialogComponent } from './card-expense-edit-dialog.component';

interface Internals {
    readonly form: FormGroup;
    readonly nothingToChange: Signal<boolean>;
    readonly personOptions: Signal<{ label: string; value: string }[]>;
    readonly categoryOptions: Signal<{ label: string; value: string }[]>;
    save(): void;
}

const NO_PERSON = '__no_person__';

describe('CardExpenseEditDialogComponent', () => {
    const cardExpenses = { updateMany: vi.fn() };
    const notifications = notificationsMock();
    const lookups = lookupsWith(
        [aCategory({ id: 'c-casa', name: 'Casa' }), aCategory({ id: 'c-velha', name: 'Velha', active: false })],
        [aPerson({ id: 'p-ana', name: 'Ana' }), aPerson({ id: 'p-ex', name: 'Ex', active: false })],
    );

    function open(expenses: CardExpense[]) {
        cardExpenses.updateMany.mockReset();
        Object.values(notifications).forEach((mock) => mock.mockReset());

        const fixture = openDialog(CardExpenseEditDialogComponent, { expenses }, [
            { provide: CardExpenseService, useValue: cardExpenses },
            { provide: NotificationService, useValue: notifications },
            { provide: ExpenseLookupsService, useValue: lookups },
        ]);

        return { fixture, dialog: internals<Internals>(fixture) };
    }

    describe('uma despesa', () => {
        const expense = aCardExpense({ id: 'ce-1', nickname: 'Mercado', categoryId: 'c-casa', personId: null });

        it('abre com o apelido, a categoria e a pessoa atuais', () => {
            const { dialog } = open([expense]);

            expect(dialog.form.getRawValue()).toEqual({ nickname: 'Mercado', categoryId: 'c-casa', personId: null });
        });

        it('envia só o que mudou; apelido vazio vira null', () => {
            const { dialog } = open([expense]);
            cardExpenses.updateMany.mockReturnValue(of([expense]));

            dialog.form.patchValue({ nickname: '  ', personId: 'p-ana' });
            dialog.save();

            expect(cardExpenses.updateMany).toHaveBeenCalledWith({
                ids: ['ce-1'],
                changes: { nickname: null, personId: 'p-ana' },
            });
            expect(notifications.success).toHaveBeenCalledWith('Despesa atualizada.');
        });

        it('avisa quando a mudança se espalhou para as próximas parcelas', () => {
            const { dialog } = open([aCardExpense({ id: 'ce-2', installment: { number: 1, total: 3 } })]);
            cardExpenses.updateMany.mockReturnValue(of([aCardExpense(), aCardExpense(), aCardExpense()]));

            dialog.form.patchValue({ nickname: 'Geladeira' });
            dialog.save();

            expect(notifications.success).toHaveBeenCalledWith('3 despesas atualizadas (inclui as próximas parcelas).');
        });

        it('sem mudanças, só avisa e fecha', () => {
            const { fixture, dialog } = open([expense]);

            dialog.save();

            expect(cardExpenses.updateMany).not.toHaveBeenCalled();
            expect(notifications.info).toHaveBeenCalledWith('Nada foi alterado.');
            expect(fixture.componentInstance.visible()).toBe(false);
        });

        it('mostra a categoria e a pessoa desativadas da despesa para não sumirem do seletor', () => {
            const { dialog } = open([aCardExpense({ categoryId: 'c-velha', personId: 'p-ex' })]);

            expect(dialog.categoryOptions()).toContainEqual({ label: 'Velha (desativada)', value: 'c-velha' });
            expect(dialog.personOptions()).toContainEqual({ label: 'Ex (desativada)', value: 'p-ex' });
        });

        it('categoria ou pessoa desativada recusada pelo back aparece no campo', () => {
            const { dialog } = open([expense]);
            dialog.form.patchValue({ categoryId: 'c-velha' });

            cardExpenses.updateMany.mockReturnValue(
                apiError(400, 'CARD_EXPENSE_INACTIVE_CATEGORY', 'Categoria desativada'),
            );
            dialog.save();

            expect(dialog.form.get('categoryId')?.getError('server')).toBe('Categoria desativada');
            expect(notifications.error).not.toHaveBeenCalled();
        });
    });

    describe('várias despesas', () => {
        const many = [aCardExpense({ id: 'ce-1' }), aCardExpense({ id: 'ce-2' })];

        it('começa com tudo vazio e oferece "Ninguém" para remover a pessoa', () => {
            const { dialog } = open(many);

            expect(dialog.form.getRawValue()).toEqual({ nickname: '', categoryId: null, personId: null });
            expect(dialog.personOptions()[0]).toEqual({ label: 'Ninguém (remover pessoa)', value: NO_PERSON });
        });

        it('campo vazio mantém como está; "Ninguém" remove a pessoa de todas', () => {
            const { dialog } = open(many);
            cardExpenses.updateMany.mockReturnValue(of(many));

            dialog.form.patchValue({ categoryId: 'c-casa', personId: NO_PERSON });
            dialog.save();

            expect(cardExpenses.updateMany).toHaveBeenCalledWith({
                ids: ['ce-1', 'ce-2'],
                changes: { categoryId: 'c-casa', personId: null },
            });
            expect(notifications.success).toHaveBeenCalledWith('2 despesas atualizadas.');
        });

        it('sem nada preenchido, pede para escolher algo em vez de fechar', () => {
            const { fixture, dialog } = open(many);

            dialog.save();

            expect(cardExpenses.updateMany).not.toHaveBeenCalled();
            expect(dialog.nothingToChange()).toBe(true);
            expect(fixture.componentInstance.visible()).toBe(true);
        });
    });
});
