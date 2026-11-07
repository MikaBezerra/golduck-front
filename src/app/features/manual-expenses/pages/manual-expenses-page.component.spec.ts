import type { Signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { SelectedMonthService } from '../../../core/month/selected-month.service';
import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { internals, renderComponent } from '../../../../testing/components';
import { aCategory, aManualExpense, aPerson } from '../../../../testing/fixtures';
import { confirmMock, type ConfirmMock, notificationsMock, type NotificationsMock } from '../../../../testing/mocks';
import { CategoryService } from '../../categories/data-access/category.service';
import { PersonService } from '../../people/data-access/person.service';
import type { ManualExpense } from '../data-access/manual-expense.models';
import { ManualExpenseService } from '../data-access/manual-expense.service';
import { ManualExpensesPageComponent } from './manual-expenses-page.component';

interface Row extends ManualExpense {
    readonly categoryName: string;
    readonly personName: string | null;
}

interface Internals {
    readonly rows: Signal<Row[]>;
    readonly selected: WritableSignal<Row[]>;
    remove(expense: ManualExpense): Promise<void>;
    removeSelected(): Promise<void>;
}

describe('ManualExpensesPageComponent (despesas do mês)', () => {
    const expenses = { findByMonth: vi.fn(), deleteMany: vi.fn() };
    let notifications: NotificationsMock;
    let confirm: ConfirmMock;

    function render(confirmAnswer = true) {
        sessionStorage.clear();
        expenses.findByMonth
            .mockReset()
            .mockReturnValue(
                of([
                    aManualExpense({ id: 'e-1', title: 'Aluguel', categoryId: 'c-casa', personId: null }),
                    aManualExpense({ id: 'e-2', title: 'Curso', categoryId: 'c-velha', personId: 'p-ana' }),
                ]),
            );
        expenses.deleteMany.mockReset();
        notifications = notificationsMock();
        confirm = confirmMock(confirmAnswer);

        const fixture = renderComponent(ManualExpensesPageComponent, {}, [
            { provide: ManualExpenseService, useValue: expenses },
            {
                provide: CategoryService,
                useValue: {
                    findAll: () =>
                        of([
                            aCategory({ id: 'c-casa', name: 'Casa' }),
                            aCategory({ id: 'c-velha', name: 'Velha', active: false }),
                        ]),
                },
            },
            { provide: PersonService, useValue: { findAll: () => of([aPerson({ id: 'p-ana', name: 'Ana' })]) } },
            { provide: NotificationService, useValue: notifications },
            { provide: ConfirmService, useValue: confirm },
        ]);
        const month = TestBed.inject(SelectedMonthService);
        month.set('2026-11');
        TestBed.tick();

        return { page: internals<Internals>(fixture), month };
    }

    afterEach(() => sessionStorage.clear());

    it('busca as despesas do mês selecionado e mostra os nomes (até de categoria desativada)', () => {
        const { page } = render();

        expect(expenses.findByMonth).toHaveBeenLastCalledWith('2026-11');
        expect(page.rows().map((row) => [row.title, row.categoryName, row.personName])).toEqual([
            ['Aluguel', 'Casa', null],
            ['Curso', 'Velha', 'Ana'],
        ]);
    });

    it('trocar de mês busca de novo e limpa a seleção', () => {
        const { page, month } = render();
        page.selected.set([page.rows()[0]]);

        month.next();
        TestBed.tick();

        expect(expenses.findByMonth).toHaveBeenLastCalledWith('2026-12');
        expect(page.selected()).toEqual([]);
    });

    it('exclui uma despesa depois de confirmar e recarrega', async () => {
        const { page } = render();
        expenses.deleteMany.mockReturnValue(of(undefined));
        expenses.findByMonth.mockClear();

        await page.remove(page.rows()[0]);

        expect(confirm.danger).toHaveBeenCalledWith(expect.objectContaining({ header: 'Excluir despesa' }));
        expect(expenses.deleteMany).toHaveBeenCalledWith(['e-1']);
        expect(notifications.success).toHaveBeenCalledWith('Despesa excluída.');
        expect(expenses.findByMonth).toHaveBeenCalledTimes(1);
    });

    it('exclui as selecionadas de uma vez', async () => {
        const { page } = render();
        expenses.deleteMany.mockReturnValue(of(undefined));
        page.selected.set(page.rows());

        await page.removeSelected();

        expect(expenses.deleteMany).toHaveBeenCalledWith(['e-1', 'e-2']);
        expect(notifications.success).toHaveBeenCalledWith('2 despesas excluídas.');
        expect(page.selected()).toEqual([]);
    });

    it('não exclui se o usuário cancelar; em erro, avisa e recarrega', async () => {
        const cancelled = render(false);
        await cancelled.page.remove(cancelled.page.rows()[0]);
        expect(expenses.deleteMany).not.toHaveBeenCalled();

        const failing = render(true);
        const error = new Error('falhou');
        expenses.deleteMany.mockReturnValue(throwError(() => error));
        await failing.page.remove(failing.page.rows()[0]);
        expect(notifications.error).toHaveBeenCalledWith(error);
    });
});
