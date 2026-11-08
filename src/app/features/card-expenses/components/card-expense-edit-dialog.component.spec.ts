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
    readonly pending: Signal<boolean>;
    readonly categoryOptions: Signal<{ label: string; value: string }[]>;
    readonly canMove: Signal<boolean>;
    save(): void;
    requestMove(): void;
}

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

        it('abre com o apelido, a categoria e a pessoa atuais ("Compartilhada" vira SHARED no seletor)', () => {
            const { dialog } = open([expense]);

            expect(dialog.form.getRawValue()).toEqual({
                nickname: 'Mercado',
                categoryId: 'c-casa',
                personId: 'SHARED',
            });
            expect(dialog.personOptions()[0]).toEqual({ label: 'Compartilhada', value: 'SHARED' });
        });

        it('compra pendente abre sem pessoa e continua pendente se só o apelido mudar', () => {
            const pending = aCardExpense({ id: 'ce-2', nickname: null, categoryId: 'c-casa', split: 'PENDING' });
            const { dialog } = open([pending]);
            cardExpenses.updateMany.mockReturnValue(of([pending]));

            expect(dialog.form.getRawValue()).toEqual({ nickname: '', categoryId: 'c-casa', personId: null });
            expect(dialog.pending()).toBe(true);

            dialog.form.patchValue({ nickname: 'Padaria' });
            dialog.save();

            expect(cardExpenses.updateMany).toHaveBeenCalledWith({ ids: ['ce-2'], changes: { nickname: 'Padaria' } });
        });

        it('escolher a pessoa de uma compra pendente manda o split', () => {
            const pending = aCardExpense({ id: 'ce-2', categoryId: 'c-casa', split: 'PENDING' });
            const { dialog } = open([pending]);
            cardExpenses.updateMany.mockReturnValue(of([pending]));

            dialog.form.patchValue({ personId: 'SHARED' });
            dialog.save();

            expect(cardExpenses.updateMany).toHaveBeenCalledWith({ ids: ['ce-2'], changes: { split: 'SHARED' } });
        });

        it('envia só o que mudou; apelido vazio vira null', () => {
            const { dialog } = open([expense]);
            cardExpenses.updateMany.mockReturnValue(of([expense]));

            dialog.form.patchValue({ nickname: '  ', personId: 'p-ana' });
            dialog.save();

            expect(cardExpenses.updateMany).toHaveBeenCalledWith({
                ids: ['ce-1'],
                changes: { nickname: null, split: 'PERSONAL', personId: 'p-ana' },
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

        it('começa com tudo vazio e oferece "Compartilhada" antes das pessoas', () => {
            const { dialog } = open(many);

            expect(dialog.form.getRawValue()).toEqual({ nickname: '', categoryId: null, personId: null });
            expect(dialog.personOptions()[0]).toEqual({ label: 'Compartilhada', value: 'SHARED' });
        });

        it('campo vazio mantém como está; "Compartilhada" vale para todas', () => {
            const { dialog } = open(many);
            cardExpenses.updateMany.mockReturnValue(of(many));

            dialog.form.patchValue({ categoryId: 'c-casa', personId: 'SHARED' });
            dialog.save();

            expect(cardExpenses.updateMany).toHaveBeenCalledWith({
                ids: ['ce-1', 'ce-2'],
                changes: { categoryId: 'c-casa', split: 'SHARED' },
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

    describe('mudar de fatura', () => {
        it('com uma despesa sincronizada, fecha e pede o diálogo de mudança', () => {
            const expense = aCardExpense({ id: 'ce-7', origin: 'SYNC' });
            const { fixture, dialog } = open([expense]);
            const requested = vi.fn();
            fixture.componentInstance.moveRequested.subscribe(requested);

            expect(dialog.canMove()).toBe(true);
            dialog.requestMove();

            expect(requested).toHaveBeenCalledWith(expense);
            expect(fixture.componentInstance.visible()).toBe(false);
        });

        it('compra de upload ou várias despesas não oferecem a mudança', () => {
            const upload = open([aCardExpense({ origin: 'UPLOAD' })]);
            const requested = vi.fn();
            upload.fixture.componentInstance.moveRequested.subscribe(requested);

            expect(upload.dialog.canMove()).toBe(false);
            upload.dialog.requestMove();
            expect(requested).not.toHaveBeenCalled();
            expect(upload.fixture.componentInstance.visible()).toBe(true);

            const many = open([aCardExpense({ id: 'a', origin: 'SYNC' }), aCardExpense({ id: 'b', origin: 'SYNC' })]);
            expect(many.dialog.canMove()).toBe(false);
        });
    });
});
