import { categoryBars, formatPercent, netRows, personBars, SHARED_ID } from './summary-view';

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
        expect(bars[0].note).toBeNull();
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

    it('marca quem gastou além da parte', () => {
        const rows = netRows([
            { personId: 'p1', name: 'Ana', share: '1000.00', individual: '300.00', net: '700.00' },
            { personId: 'p2', name: 'Bia', share: '1000.00', individual: '1200.50', net: '-200.50' },
        ]);

        expect(rows.map((row) => row.negative)).toEqual([false, true]);
    });
});
