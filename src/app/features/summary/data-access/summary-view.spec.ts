import type { SummaryMonth } from './summary.models';
import {
    amountDelta,
    categoryBars,
    formatPercent,
    netCards,
    niceScale,
    personBars,
    SHARED_ID,
    sparkline,
    yearChart,
} from './summary-view';

const month = (
    key: string,
    income: string | null,
    expensesTotal: string,
    balance: string,
    count = 1,
    reserve: string | null = null,
): SummaryMonth => ({
    month: key,
    income,
    reserve,
    expensesTotal,
    expensesCount: count,
    balance,
    pendingCount: 0,
});

describe('summary-view', () => {
    it('formata a parte do total sem mostrar zero para valores pequenos', () => {
        expect(formatPercent(0.4231)).toBe('42%');
        expect(formatPercent(0.003)).toBe('<1%');
        expect(formatPercent(0)).toBe('0%');
        expect(formatPercent(1.25)).toBe('125%');
    });

    it('monta as barras por categoria proporcionais à maior', () => {
        const bars = categoryBars(
            [
                { categoryId: 'a', name: 'Mercado', active: true, amount: '300.00', count: 3 },
                { categoryId: 'b', name: 'Antiga', active: false, amount: '100.00', count: 1 },
                { categoryId: 'c', name: 'Café', active: true, amount: '0.10', count: 1 },
            ],
            '400.10',
        );

        expect(bars.map((bar) => bar.width)).toEqual([100, (100 / 300) * 100, 1]);
        expect(bars.map((bar) => bar.share)).toEqual(['75%', '25%', '<1%']);
        expect(bars[1].note).toBe('inativa');
    });

    it('chama de compartilhadas as despesas sem pessoa', () => {
        const [shared, person] = personBars(
            [
                { personId: null, name: null, active: null, amount: '200.00', count: 2 },
                { personId: 'p1', name: 'Ana', active: false, amount: '50.00', count: 1 },
            ],
            '250.00',
        );

        expect(shared).toMatchObject({ id: SHARED_ID, label: 'Compartilhadas', note: 'sem pessoa', share: '80%' });
        expect(person).toMatchObject({ id: 'p1', label: 'Ana', note: 'inativa', share: '20%' });
    });

    it('mede quanto da parte cada pessoa gastou', () => {
        const [ana, bia, caio] = netCards([
            { personId: 'p1', name: 'ana', share: '1000.00', individual: '250.00', net: '750.00' },
            { personId: 'p2', name: 'Bia', share: '1000.00', individual: '1200.50', net: '-200.50' },
            { personId: 'p3', name: 'Caio', share: '-50.00', individual: '10.00', net: '-60.00' },
        ]);

        expect(ana).toMatchObject({ negative: false, usage: 25, initial: 'A' });
        expect(bia).toMatchObject({ negative: true, usage: 100 });
        expect(caio).toMatchObject({ negative: true, usage: 100 });
    });

    it('compara com o mês anterior', () => {
        expect(amountDelta('1500.00', '1200.50')).toEqual({ direction: 'up', amount: '299.50' });
        expect(amountDelta('-100.00', '50.00')).toEqual({ direction: 'down', amount: '150.00' });
        expect(amountDelta('10.00', '10.00')).toEqual({ direction: 'same', amount: '0.00' });
    });

    it('escolhe um topo redondo para o eixo', () => {
        expect(niceScale(736000)).toEqual({ max: 800000, step: 200000 });
        expect(niceScale(600000)).toEqual({ max: 800000, step: 200000 });
        expect(niceScale(0)).toEqual({ max: 0, step: 0 });
    });

    it('monta o gráfico do ano com alturas na mesma escala', () => {
        const chart = yearChart([
            month('2026-01', '6000.00', '4000.00', '2000.00'),
            month('2026-02', null, '0.00', '0.00', 0),
            month('2026-03', '6000.00', '7360.00', '-1360.00'),
        ]);

        // O Intl usa espaço inquebrável entre o número e "mil".
        const labels = chart.ticks.map((tick) => tick.label.replace(/\s/g, ' '));

        expect(labels).toEqual(['0', '2 mil', '4 mil', '6 mil', '8 mil']);
        expect(chart.points[0]).toMatchObject({ incomeHeight: 75, expenseHeight: 50, shortLabel: 'jan', initial: 'J' });
        expect(chart.points[1]).toMatchObject({ incomeHeight: 0, empty: true });
        expect(chart.points[2]).toMatchObject({ expenseHeight: 92, negative: true, longLabel: 'Março de 2026' });
        expect(chart.points[1].ariaLabel).toContain('entrada não cadastrada');
        expect(chart.empty).toBe(false);
    });

    it('empilha a reserva sobre as despesas na mesma escala da entrada', () => {
        const chart = yearChart([
            month('2026-01', '5000.00', '3000.00', '1000.00', 1, '1000.00'),
            month('2026-02', '5000.00', '7000.00', '-3000.00', 1, '1000.00'),
        ]);

        // Topo da escala vem da pilha de fevereiro (7.000 + 1.000), não da entrada.
        expect(chart.ticks.at(-1)?.label.replace(/\s/g, ' ')).toBe('10 mil');
        expect(chart.points[0]).toMatchObject({ incomeHeight: 50, expenseHeight: 30, reserveHeight: 10 });
        expect(chart.points[1].ariaLabel).toContain('reserva');
        expect(chart.points[1].ariaLabel).toContain('1.000,00');
    });

    it('desenha a sparkline com o zero visível', () => {
        const line = sparkline([0, 100, -100], 1);

        expect(line.points).toBe('0,16 50,2 100,30');
        expect(line.zeroY).toBe(16);
        expect(line.markerX).toBe(50);
    });
});
