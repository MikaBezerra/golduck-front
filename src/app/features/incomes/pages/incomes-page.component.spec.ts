import type { Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { SelectedMonthService } from '../../../core/month/selected-month.service';
import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { internals, renderComponent } from '../../../../testing/components';
import { anIncome, aReserve } from '../../../../testing/fixtures';
import { confirmMock, notificationsMock } from '../../../../testing/mocks';
import { ReserveService } from '../../reserves/data-access/reserve.service';
import type { MonthlyAmountKind } from '../components/monthly-amount-form-dialog.component';
import { IncomeService } from '../data-access/income.service';
import { IncomesPageComponent } from './incomes-page.component';

interface Row {
    readonly month: string;
    readonly income: unknown;
    readonly reserve: unknown;
    readonly selected: boolean;
}

interface Internals {
    readonly rows: Signal<Row[]>;
    readonly takenMonths: Signal<number[]>;
    readonly dialogVisible: Signal<boolean>;
    openCreate(kind: MonthlyAmountKind, presetMonths?: number[]): void;
    afterSave(): void;
    previousYear(): void;
    nextYear(): void;
}

describe('IncomesPageComponent (entradas e reservas do ano)', () => {
    const incomes = { findByYear: vi.fn() };
    const reserves = { findByYear: vi.fn(), totals: vi.fn() };

    function render() {
        sessionStorage.clear();
        incomes.findByYear.mockReset().mockReturnValue(of([anIncome({ month: '2026-03', amount: '5000.00' })]));
        reserves.findByYear.mockReset().mockReturnValue(of([aReserve({ month: '2026-11', amount: '500.00' })]));
        reserves.totals.mockReset().mockReturnValue(of({ total: '500.00', count: 1, byYear: [] }));

        const fixture = renderComponent(IncomesPageComponent, {}, [
            { provide: IncomeService, useValue: incomes },
            { provide: ReserveService, useValue: reserves },
            { provide: NotificationService, useValue: notificationsMock() },
            { provide: ConfirmService, useValue: confirmMock() },
        ]);
        const month = TestBed.inject(SelectedMonthService);
        month.set('2026-11');
        TestBed.tick();

        return { page: internals<Internals>(fixture), month };
    }

    afterEach(() => sessionStorage.clear());

    it('monta os 12 meses do ano, encaixando entrada e reserva de cada mês e marcando o selecionado', () => {
        const { page } = render();
        const rows = page.rows();

        expect(rows).toHaveLength(12);
        expect(rows[2]).toMatchObject({ month: '2026-03', income: expect.objectContaining({ amount: '5000.00' }) });
        expect(rows[2].reserve).toBeNull();
        expect(rows[10]).toMatchObject({ month: '2026-11', selected: true });
        expect(rows[10].reserve).toMatchObject({ amount: '500.00' });
        expect(incomes.findByYear).toHaveBeenLastCalledWith(2026);
    });

    it('troca de ano pelo mês selecionado e busca o ano novo', () => {
        const { page, month } = render();

        page.nextYear();
        TestBed.tick();
        expect(month.month()).toBe('2027-11');
        expect(incomes.findByYear).toHaveBeenLastCalledWith(2027);

        page.previousYear();
        TestBed.tick();
        expect(month.month()).toBe('2026-11');
    });

    it('no cadastro, bloqueia os meses que já têm valor do tipo aberto', () => {
        const { page } = render();

        page.openCreate('income');
        expect(page.dialogVisible()).toBe(true);
        expect(page.takenMonths()).toEqual([3]);

        page.openCreate('reserve', [12]);
        expect(page.takenMonths()).toEqual([11]);
    });

    it('depois de salvar, recarrega só o que mudou (reserva também atualiza o total guardado)', () => {
        const { page } = render();
        incomes.findByYear.mockClear();
        reserves.findByYear.mockClear();
        reserves.totals.mockClear();

        page.openCreate('income');
        page.afterSave();
        expect(incomes.findByYear).toHaveBeenCalledTimes(1);
        expect(reserves.findByYear).not.toHaveBeenCalled();

        page.openCreate('reserve');
        page.afterSave();
        expect(reserves.findByYear).toHaveBeenCalledTimes(1);
        expect(reserves.totals).toHaveBeenCalledTimes(1);
    });
});
