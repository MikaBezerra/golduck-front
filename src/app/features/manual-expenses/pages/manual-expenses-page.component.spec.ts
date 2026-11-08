import type { Signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { SelectedMonthService } from '../../../core/month/selected-month.service';
import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { internals, renderComponent } from '../../../../testing/components';
import { aManualExpense, aPerson } from '../../../../testing/fixtures';
import { confirmMock, type ConfirmMock, notificationsMock, type NotificationsMock } from '../../../../testing/mocks';
import { CategoryService } from '../../categories/data-access/category.service';
import { PersonService } from '../../people/data-access/person.service';
import type { ManualExpense } from '../data-access/manual-expense.models';
import { ManualExpenseService } from '../data-access/manual-expense.service';
import { ManualExpensesPageComponent } from './manual-expenses-page.component';

interface Row extends ManualExpense {
    readonly personName: string;
    readonly paid: boolean;
}

interface Internals {
    readonly rows: Signal<Row[]>;
    readonly selected: WritableSignal<Row[]>;
    remove(expense: ManualExpense): Promise<void>;
    removeSelected(): Promise<void>;
    readonly selectedHasPaid: Signal<boolean>;
    readonly selectedHasUnpaid: Signal<boolean>;
    togglePaid(expense: Row): void;
    markSelectedPaid(paid: boolean): void;
}

describe('ManualExpensesPageComponent (despesas do mês)', () => {
    const expenses = { findByMonth: vi.fn(), deleteMany: vi.fn(), setPaid: vi.fn(), summarize: vi.fn() };
    const categories = { findAll: vi.fn() };
    let notifications: NotificationsMock;
    let confirm: ConfirmMock;

    function render(confirmAnswer = true) {
        sessionStorage.clear();
        categories.findAll.mockReset();
        expenses.findByMonth.mockReset().mockReturnValue(
            of([
                aManualExpense({ id: 'e-1', title: 'Aluguel', personId: null }),
                aManualExpense({
                    id: 'e-2',
                    title: 'Curso',
                    personId: 'p-ana',
                    paidAt: '2026-11-05T12:00:00.000Z',
                }),
            ]),
        );
        expenses.deleteMany.mockReset();
        expenses.setPaid.mockReset();
        expenses.summarize.mockReset().mockReturnValue(
            of({
                month: '2026-11',
                total: '2000.00',
                paid: '500.00',
                unpaid: '1500.00',
                count: 2,
            }),
        );
        notifications = notificationsMock();
        confirm = confirmMock(confirmAnswer);

        const fixture = renderComponent(ManualExpensesPageComponent, {}, [
            { provide: ManualExpenseService, useValue: expenses },
            { provide: CategoryService, useValue: categories },
            { provide: PersonService, useValue: { findAll: () => of([aPerson({ id: 'p-ana', name: 'Ana' })]) } },
            { provide: NotificationService, useValue: notifications },
            { provide: ConfirmService, useValue: confirm },
        ]);
        const month = TestBed.inject(SelectedMonthService);
        month.set('2026-11');
        TestBed.tick();

        const text = (): string => {
            fixture.detectChanges();

            return (fixture.nativeElement as HTMLElement).textContent ?? '';
        };

        return { page: internals<Internals>(fixture), month, text };
    }

    afterEach(() => sessionStorage.clear());

    it('busca as despesas do mês selecionado e mostra o nome da pessoa (sem categoria nem busca de categorias)', () => {
        const { page, text } = render();

        expect(expenses.findByMonth).toHaveBeenLastCalledWith('2026-11');
        expect(page.rows().map((row) => [row.title, row.personName])).toEqual([
            ['Aluguel', 'Compartilhada'],
            ['Curso', 'Ana'],
        ]);
        expect(categories.findAll).not.toHaveBeenCalled();
        expect(text()).not.toContain('Categoria');
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

    it('paga: a linha sabe se foi paga; o botão ✓ alterna e recarrega', () => {
        const { page } = render();
        expenses.setPaid.mockReturnValue(of([]));
        expenses.findByMonth.mockClear();

        expect(page.rows().map((row) => row.paid)).toEqual([false, true]);

        page.togglePaid(page.rows()[0]);
        expect(expenses.setPaid).toHaveBeenLastCalledWith(['e-1'], true);
        expect(notifications.success).toHaveBeenLastCalledWith('"Aluguel" marcada como paga.');

        page.togglePaid(page.rows()[1]);
        expect(expenses.setPaid).toHaveBeenLastCalledWith(['e-2'], false);
        expect(notifications.success).toHaveBeenLastCalledWith('"Curso" voltou para a pagar.');
        expect(expenses.findByMonth).toHaveBeenCalledTimes(2);
    });

    it('seleção: mostra as ações que cabem e marca ou desmarca todas de uma vez', () => {
        const { page } = render();
        expenses.setPaid.mockReturnValue(of([]));

        page.selected.set([page.rows()[0]]);
        expect([page.selectedHasUnpaid(), page.selectedHasPaid()]).toEqual([true, false]);
        page.markSelectedPaid(true);
        expect(notifications.success).toHaveBeenLastCalledWith('1 despesa marcada como paga.');

        page.selected.set(page.rows());
        expect([page.selectedHasUnpaid(), page.selectedHasPaid()]).toEqual([true, true]);
        page.markSelectedPaid(false);
        expect(expenses.setPaid).toHaveBeenLastCalledWith(['e-1', 'e-2'], false);
        expect(notifications.success).toHaveBeenLastCalledWith('2 despesas voltaram para a pagar.');

        page.selected.set(page.rows());
        page.markSelectedPaid(true);
        expect(notifications.success).toHaveBeenLastCalledWith('2 despesas marcadas como pagas.');

        page.selected.set([page.rows()[1]]);
        page.markSelectedPaid(false);
        expect(notifications.success).toHaveBeenLastCalledWith('1 despesa voltou para a pagar.');
    });

    it('erro ao marcar como paga vira aviso', () => {
        const { page } = render();
        const error = new Error('falhou');
        expenses.setPaid.mockReturnValue(throwError(() => error));

        page.togglePaid(page.rows()[0]);

        expect(notifications.error).toHaveBeenCalledWith(error);
    });

    it('resumo do mês no topo: total, pago e a pagar (sem categorias); recarrega depois de mudar algo', () => {
        const { page, text } = render();
        expenses.setPaid.mockReturnValue(of([]));

        expect(expenses.summarize).toHaveBeenLastCalledWith('2026-11');
        expect(text()).toContain('Resumo de');
        expect(text()).toContain('25% pago');
        expect(text()).not.toContain('Por categoria');

        page.togglePaid(page.rows()[0]);

        expect(expenses.summarize).toHaveBeenCalledTimes(2);
    });

    it('mês sem despesas: só os totais zerados, sem a barra de pago', () => {
        const { text } = render();
        expenses.summarize.mockReturnValue(
            of({ month: '2026-12', total: '0.00', paid: '0.00', unpaid: '0.00', count: 0 }),
        );
        expenses.findByMonth.mockReturnValue(of([]));

        TestBed.inject(SelectedMonthService).next();
        TestBed.tick();

        expect(text()).not.toContain('pago');
        expect(text()).toContain('A pagar');
    });
});
