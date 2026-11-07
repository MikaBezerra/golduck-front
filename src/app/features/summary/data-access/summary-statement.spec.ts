import { buildStatement, reconcile, splitEvenly, type StatementSource } from './summary-statement';

const source: StatementSource = {
    month: '2026-11',
    income: '6000.00',
    reserve: '500.00',
    people: [
        { id: 'bruno', name: 'Bruno', active: true },
        { id: 'ana', name: 'Ana', active: true },
        { id: 'carla', name: 'Carla', active: false },
        { id: 'davi', name: 'Davi', active: false },
    ],
    manualExpenses: [
        { id: 'm1', title: 'Aluguel', amount: '2200.00', personId: null },
        { id: 'm2', title: 'Condomínio', amount: '650.01', personId: null },
        { id: 'm3', title: 'Curso', amount: '420.00', personId: 'bruno' },
        { id: 'm4', title: 'Presente', amount: '90.00', personId: 'carla' },
    ],
    cardExpenses: [
        { id: 'c1', cardId: 'nubank', description: 'Mercado', amount: '412.35', personId: null, excluded: false },
        { id: 'c2', cardId: 'nubank', description: 'Cinema', amount: '78.00', personId: 'ana', excluded: false },
        { id: 'c3', cardId: 'nubank', description: 'Uber', amount: '23.40', personId: null, excluded: true },
    ],
    cards: [{ id: 'nubank', name: 'Nubank da Ana' }],
};

const rowOf = (id: string) => {
    const row = buildStatement(source)
        .sections.flatMap((section) => section.rows)
        .find((item) => item.id === id);

    if (!row) {
        throw new Error(`linha ${id} não encontrada`);
    }

    return row;
};

describe('summary-statement', () => {
    it('divide como o back: centavos que sobram vão para as primeiras partes', () => {
        expect(splitEvenly(223764, 2)).toEqual([111882, 111882]);
        expect(splitEvenly(100, 3)).toEqual([34, 33, 33]);
        expect(splitEvenly(-100, 3)).toEqual([-34, -33, -33]);
        expect(splitEvenly(100, 0)).toEqual([]);
    });

    it('ajusta as linhas para somarem o alvo de cada pessoa sem mudar o total da linha', () => {
        const rows = reconcile(
            [
                [142501, 142500],
                [20618, 20617],
            ],
            [163118, 163118],
        );

        expect(rows[0].reduce((a, b) => a + b, 0)).toBe(285001);
        expect(rows.map((parts) => parts[0]).reduce((a, b) => a + b, 0)).toBe(163118);
        expect(rows.map((parts) => parts[1]).reduce((a, b) => a + b, 0)).toBe(163118);
    });

    it('mostra as pessoas ativas em ordem alfabética e as inativas só se tiverem gasto individual', () => {
        expect(buildStatement(source).columns.map((column) => `${column.name}:${column.inactive}`)).toEqual([
            'Ana:false',
            'Bruno:false',
            'Carla:true',
        ]);
    });

    it('divide entrada e compartilhado igualmente e soma cada coluna', () => {
        expect(rowOf('income').cells).toEqual(['3000.00', '3000.00', null]);
        expect(rowOf('shared-fixed').total).toBe('2850.01');
        expect(rowOf('shared-card').total).toBe('412.35');
        expect(rowOf('reserve').cells).toEqual(['250.00', '250.00', null]);
        // Cada pessoa paga a mesma parte do compartilhado (a sobra de centavo some no ajuste).
        expect(rowOf('shared-total')).toMatchObject({ total: '3762.36', cells: ['1881.18', '1881.18', null] });

        const parts = ['shared-fixed', 'shared-card', 'reserve'].map((id) => rowOf(id).cells[0] ?? '0');

        expect(parts.reduce((total, value) => total + Math.round(Number(value) * 100), 0)).toBe(188118);
    });

    it('põe cada gasto individual na coluna da pessoa (inclusive inativa) e ignora excluídas', () => {
        expect(rowOf('individual-fixed').cells).toEqual(['0.00', '420.00', '90.00']);
        expect(rowOf('individual-card').cells).toEqual(['78.00', '0.00', '0.00']);
        expect(rowOf('individual-total')).toMatchObject({ total: '588.00', cells: ['78.00', '420.00', '90.00'] });
        expect(rowOf('shared-card').children.map((child) => `${child.label}:${child.total}`)).toEqual([
            'Nubank da Ana:412.35',
        ]);
    });

    it('calcula os líquidos como o back (mesmo centavo da visão geral)', () => {
        expect(rowOf('spent')).toMatchObject({ total: '4350.36', cells: ['1959.18', '2301.18', '90.00'] });
        expect(rowOf('net-shared')).toMatchObject({ total: '2237.64', cells: ['1118.82', '1118.82', null] });
        expect(rowOf('net-individual')).toMatchObject({ total: '1739.64', cells: ['1040.82', '698.82', null] });
    });

    it('sem entrada e sem reserva no mês, avisa e trata como zero', () => {
        const statement = buildStatement({ ...source, income: null, reserve: null });
        const rows = statement.sections.flatMap((section) => section.rows);
        const net = rows.find((item) => item.id === 'net-shared');

        expect(statement.incomeMissing).toBe(true);
        expect(rows.find((item) => item.id === 'income')).toMatchObject({ total: null, note: 'não cadastrada' });
        expect(rows.find((item) => item.id === 'reserve')).toMatchObject({ total: '0.00', note: 'não cadastrada' });
        expect(net?.total).toBe('-3262.36');
    });
});
