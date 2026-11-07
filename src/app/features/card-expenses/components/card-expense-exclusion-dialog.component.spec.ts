import type { Signal } from '@angular/core';
import type { FormControl } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { internals, openDialog } from '../../../../testing/components';
import { aCardExpense } from '../../../../testing/fixtures';
import { notificationsMock } from '../../../../testing/mocks';
import type { CardExpense } from '../data-access/card-expense.models';
import { CardExpenseService } from '../data-access/card-expense.service';
import { CardExpenseExclusionDialogComponent } from './card-expense-exclusion-dialog.component';

interface Internals {
    readonly scope: FormControl<string>;
    readonly title: Signal<string>;
    readonly hasInstallments: Signal<boolean>;
    confirm(): void;
}

describe('CardExpenseExclusionDialogComponent (excluir e restaurar compras do cartão)', () => {
    const cardExpenses = { exclude: vi.fn(), restore: vi.fn() };
    const notifications = notificationsMock();

    function open(expenses: CardExpense[], mode: 'exclude' | 'restore' = 'exclude') {
        cardExpenses.exclude.mockReset();
        cardExpenses.restore.mockReset();
        Object.values(notifications).forEach((mock) => mock.mockReset());

        const fixture = openDialog(CardExpenseExclusionDialogComponent, { expenses, mode }, [
            { provide: CardExpenseService, useValue: cardExpenses },
            { provide: NotificationService, useValue: notifications },
        ]);
        const done = vi.fn();
        fixture.componentInstance.done.subscribe(done);

        return { fixture, dialog: internals<Internals>(fixture), done };
    }

    it('título conforme a ação e a quantidade; escopo começa em "all"', () => {
        expect(open([aCardExpense()]).dialog.title()).toBe('Excluir despesa');

        const many = open([aCardExpense({ id: 'a' }), aCardExpense({ id: 'b' })], 'restore');
        expect(many.dialog.title()).toBe('Restaurar 2 despesas');
        expect(many.dialog.scope.value).toBe('all');
    });

    it('identifica compras parceladas (para mostrar a escolha de parcelas)', () => {
        expect(open([aCardExpense()]).dialog.hasInstallments()).toBe(false);
        expect(open([aCardExpense({ installment: { number: 1, total: 3 } })]).dialog.hasInstallments()).toBe(true);
    });

    it('exclui com o escopo escolhido, avisa e fecha', () => {
        const { fixture, dialog, done } = open([aCardExpense({ id: 'ce-1' })]);
        cardExpenses.exclude.mockReturnValue(of(undefined));

        dialog.scope.setValue('forward');
        dialog.confirm();

        expect(cardExpenses.exclude).toHaveBeenCalledWith({ ids: ['ce-1'], scope: 'forward' });
        expect(notifications.success).toHaveBeenCalledWith('Despesa excluída.');
        expect(done).toHaveBeenCalled();
        expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('restaura várias de uma vez', () => {
        const { dialog } = open([aCardExpense({ id: 'a' }), aCardExpense({ id: 'b' })], 'restore');
        cardExpenses.restore.mockReturnValue(of([]));

        dialog.confirm();

        expect(cardExpenses.restore).toHaveBeenCalledWith({ ids: ['a', 'b'], scope: 'all' });
        expect(notifications.success).toHaveBeenCalledWith('2 despesas restauradas.');
    });

    it('em erro, avisa e mantém o diálogo aberto', () => {
        const { fixture, dialog, done } = open([aCardExpense()]);
        const error = new Error('falhou');
        cardExpenses.exclude.mockReturnValue(throwError(() => error));

        dialog.confirm();

        expect(notifications.error).toHaveBeenCalledWith(error);
        expect(done).not.toHaveBeenCalled();
        expect(fixture.componentInstance.visible()).toBe(true);
    });
});
