import { amountToCents, centsToAmount } from '../../../shared/money/money';
import type { CardExpense } from '../../card-expenses/data-access/card-expense.models';
import type { CreditCard } from '../../credit-cards/data-access/credit-card.models';
import type { ManualExpense } from '../../manual-expenses/data-access/manual-expense.models';
import type { Person } from '../../people/data-access/person.models';

/*
 * Resumo do mês em tabela, uma coluna por pessoa. Função pura (sem Angular), como um
 * "service de cálculo" no back: recebe as listas da API e devolve as linhas prontas.
 *
 * Regras (as mesmas do resumo do back, com a reserva somada ao compartilhado):
 * - compartilhado = gastos fixos sem pessoa + compras do cartão sem pessoa + reserva,
 *   dividido igualmente entre as pessoas ativas (centavos que sobram vão para as primeiras
 *   em ordem alfabética);
 * - líquido compartilhado = entrada − compartilhado;
 * - líquido individual = parte do líquido compartilhado − gastos individuais da pessoa.
 * Tudo em centavos (inteiros), nunca somando números com vírgula.
 */

export type StatementPerson = Pick<Person, 'id' | 'name' | 'active'>;
export type StatementManualExpense = Pick<ManualExpense, 'id' | 'title' | 'amount' | 'personId'>;
export type StatementCardExpense = Pick<
    CardExpense,
    'id' | 'cardId' | 'description' | 'amount' | 'personId' | 'excluded'
>;
export type StatementCard = Pick<CreditCard, 'id' | 'name'>;

export interface StatementSource {
    /** `"AAAA-MM"` */
    readonly month: string;
    /** null = sem entrada cadastrada no mês. */
    readonly income: string | null;
    /** null = sem reserva no mês. */
    readonly reserve: string | null;
    /** Todas as pessoas (ativas e inativas). */
    readonly people: readonly StatementPerson[];
    readonly manualExpenses: readonly StatementManualExpense[];
    readonly cardExpenses: readonly StatementCardExpense[];
    readonly cards: readonly StatementCard[];
}

export interface StatementColumn {
    readonly id: string;
    readonly name: string;
    readonly initial: string;
    /** Pessoa inativa com gasto individual no mês: não entra na divisão. */
    readonly inactive: boolean;
}

export type StatementRowStyle = 'item' | 'detail' | 'subtotal' | 'result' | 'highlight';

export interface StatementRow {
    readonly id: string;
    readonly label: string;
    readonly note: string | null;
    /** Coluna "Total"; null = não se aplica. */
    readonly total: string | null;
    /** Um valor por coluna de pessoa; null = não se aplica (na tela, "—" ou vazio nos detalhes). */
    readonly cells: readonly (string | null)[];
    /** Linhas que abrem ao clicar (cada despesa, cada cartão). */
    readonly children: readonly StatementRow[];
    readonly style: StatementRowStyle;
}

export interface StatementSection {
    readonly id: string;
    readonly title: string;
    readonly hint: string;
    readonly rows: readonly StatementRow[];
}

export interface Statement {
    readonly month: string;
    readonly columns: readonly StatementColumn[];
    readonly sections: readonly StatementSection[];
    /** Há pessoas ativas para dividir o compartilhado. */
    readonly hasPeople: boolean;
    readonly incomeMissing: boolean;
}

type Cells = (number | null)[];

export function buildStatement(source: StatementSource): Statement {
    const byName = (first: StatementPerson, second: StatementPerson): number =>
        first.name.localeCompare(second.name, 'pt-BR') || first.id.localeCompare(second.id);
    const participants = source.people.filter((person) => person.active).sort(byName);
    const cardExpenses = source.cardExpenses.filter((expense) => !expense.excluded);
    const individualIds = new Set(
        [...source.manualExpenses, ...cardExpenses]
            .map((expense) => expense.personId)
            .filter((id): id is string => id !== null),
    );
    // Inativas só aparecem se tiverem gasto individual no mês (e não entram na divisão).
    const inactive = source.people.filter((person) => !person.active && individualIds.has(person.id)).sort(byName);
    const people = [...participants, ...inactive];
    const columnOf = new Map(people.map((person, index) => [person.id, index]));
    const width = people.length;

    const count = participants.length;
    /** Valores das pessoas ativas viram células; as inativas ficam sem valor. */
    const toCells = (parts: readonly number[]): Cells =>
        people.map((_, index) => (index < count ? parts[index] : null));
    /** Soma coluna a coluna (null + null = null). */
    const add = (...rows: Cells[]): Cells =>
        Array.from({ length: width }, (_, index) =>
            rows.every((row) => row[index] === null) ? null : rows.reduce((total, row) => total + (row[index] ?? 0), 0),
        );
    const subtract = (left: Cells, right: Cells): Cells =>
        left.map((value, index) => (value === null ? null : value - (right[index] ?? 0)));
    /** Valores de quem gastou: cada despesa na coluna da sua pessoa. */
    const perPerson = (items: readonly { readonly amount: string; readonly personId: string | null }[]): Cells => {
        const cells: Cells = people.map(() => 0);

        for (const item of items) {
            const index = item.personId === null ? undefined : columnOf.get(item.personId);

            if (index !== undefined) {
                cells[index] = (cells[index] ?? 0) + amountToCents(item.amount);
            }
        }

        return cells;
    };
    const sum = (items: readonly { readonly amount: string }[]): number =>
        items.reduce((total, item) => total + amountToCents(item.amount), 0);

    const cardName = new Map(source.cards.map((card) => [card.id, card.name]));
    const byCard = <T extends StatementCardExpense>(items: readonly T[]): [string, T[]][] => {
        const groups = new Map<string, T[]>();

        for (const item of items) {
            groups.set(item.cardId, [...(groups.get(item.cardId) ?? []), item]);
        }

        return [...groups.entries()].sort(([first], [second]) =>
            (cardName.get(first) ?? '').localeCompare(cardName.get(second) ?? '', 'pt-BR'),
        );
    };
    const byAmount = <T extends { readonly amount: string }>(items: readonly T[]): T[] =>
        [...items].sort((first, second) => amountToCents(second.amount) - amountToCents(first.amount));

    // ---------- Entrada ----------
    const incomeCents = source.income === null ? 0 : amountToCents(source.income);
    const incomeParts = splitEvenly(incomeCents, count);
    const incomeCells = toCells(incomeParts);
    const incomeRow = row('income', 'Entrada do mês', source.income === null ? 'não cadastrada' : null, {
        total: source.income === null ? null : incomeCents,
        cells: source.income === null ? people.map(() => null) : incomeCells,
    });

    // ---------- Compartilhado ----------
    const sharedManual = source.manualExpenses.filter((expense) => expense.personId === null);
    const sharedCard = cardExpenses.filter((expense) => expense.personId === null);
    const reserveCents = source.reserve === null ? 0 : amountToCents(source.reserve);
    const sharedTotal = sum(sharedManual) + sum(sharedCard) + reserveCents;
    // Regra do back: divide (entrada − compartilhado) uma vez só. O compartilhado de cada um é o que
    // falta para isso bater, e as linhas (fixos, cartões, reserva) são ajustadas para somar exatamente.
    const netSharedParts = splitEvenly(incomeCents - sharedTotal, count);
    const sharedParts = incomeParts.map((part, index) => part - netSharedParts[index]);
    const [fixedSharedParts, cardSharedParts, reserveParts] = reconcile(
        [sum(sharedManual), sum(sharedCard), reserveCents].map((total) => splitEvenly(total, count)),
        sharedParts,
    );
    const fixedSharedCells = toCells(fixedSharedParts);
    const cardSharedCells = toCells(cardSharedParts);
    const reserveCells = toCells(reserveParts);
    const sharedCells = toCells(sharedParts);

    const sharedSection: StatementSection = {
        id: 'shared',
        title: 'Compartilhado',
        hint: 'Dividido igualmente entre as pessoas ativas',
        rows: [
            row('shared-fixed', 'Gastos fixos', 'despesas fora do cartão', {
                total: sum(sharedManual),
                cells: fixedSharedCells,
                children: byAmount(sharedManual).map((expense) =>
                    detail(`shared-fixed-${expense.id}`, expense.title, amountToCents(expense.amount), width),
                ),
            }),
            row('shared-card', 'Cartões', 'compras compartilhadas', {
                total: sum(sharedCard),
                cells: cardSharedCells,
                children: byCard(sharedCard).map(([cardId, items]) =>
                    detail(`shared-card-${cardId}`, cardName.get(cardId) ?? 'Cartão', sum(items), width),
                ),
            }),
            row('reserve', 'Reserva', source.reserve === null ? 'não cadastrada' : 'guardado no mês', {
                total: reserveCents,
                cells: reserveCells,
            }),
            row('shared-total', 'Total compartilhado', null, {
                total: sharedTotal,
                cells: sharedCells,
                style: 'subtotal',
            }),
        ],
    };

    // ---------- Individual ----------
    const individualManual = source.manualExpenses.filter((expense) => expense.personId !== null);
    const individualCard = cardExpenses.filter((expense) => expense.personId !== null);
    const fixedIndividualCells = perPerson(individualManual);
    const cardIndividualCells = perPerson(individualCard);
    const individualCells = add(fixedIndividualCells, cardIndividualCells);
    const individualTotal = sum(individualManual) + sum(individualCard);

    const onlyIn = (personId: string | null, cents: number): Cells =>
        people.map((person) => (person.id === personId ? cents : null));
    const individualSection: StatementSection = {
        id: 'individual',
        title: 'Individual',
        hint: 'Gastos com pessoa, cada um na sua coluna',
        rows: [
            row('individual-fixed', 'Gastos fixos', 'despesas fora do cartão', {
                total: sum(individualManual),
                cells: fixedIndividualCells,
                children: byAmount(individualManual).map((expense) =>
                    row(`individual-fixed-${expense.id}`, expense.title, null, {
                        total: amountToCents(expense.amount),
                        cells: onlyIn(expense.personId, amountToCents(expense.amount)),
                        style: 'detail',
                    }),
                ),
            }),
            row('individual-card', 'Cartões', 'compras individuais', {
                total: sum(individualCard),
                cells: cardIndividualCells,
                children: byCard(individualCard).map(([cardId, items]) =>
                    row(`individual-card-${cardId}`, cardName.get(cardId) ?? 'Cartão', null, {
                        total: sum(items),
                        cells: perPerson(items).map((cents) => (cents === 0 ? null : cents)),
                        style: 'detail',
                    }),
                ),
            }),
            row('individual-total', 'Total individual', null, {
                total: individualTotal,
                cells: individualCells,
                style: 'subtotal',
            }),
        ],
    };

    // ---------- Resultado ----------
    const spentCells = add(sharedCells, individualCells);
    const netSharedCells = toCells(netSharedParts);
    const netIndividualCells = subtract(netSharedCells, individualCells);
    const netIndividualTotal = netIndividualCells.reduce<number>((total, value) => total + (value ?? 0), 0);

    const resultSection: StatementSection = {
        id: 'result',
        title: 'Resultado',
        hint: 'O que sobra para cada um',
        rows: [
            row('spent', 'Total de gastos', 'compartilhado + individual', {
                total: sharedTotal + individualTotal,
                cells: spentCells,
                style: 'subtotal',
            }),
            row('net-shared', 'Líquido compartilhado', 'entrada − compartilhado', {
                total: incomeCents - sharedTotal,
                cells: netSharedCells,
                style: 'result',
            }),
            row('net-individual', 'Líquido individual', 'parte − gastos individuais', {
                total: count > 0 ? netIndividualTotal : incomeCents - sharedTotal - individualTotal,
                cells: netIndividualCells,
                style: 'highlight',
            }),
        ],
    };

    return {
        month: source.month,
        columns: people.map((person) => ({
            id: person.id,
            name: person.name,
            initial: person.name.charAt(0).toUpperCase(),
            inactive: !person.active,
        })),
        sections: [
            { id: 'income', title: 'Entrada', hint: 'Dividida igualmente entre as pessoas ativas', rows: [incomeRow] },
            sharedSection,
            individualSection,
            resultSection,
        ],
        hasPeople: participants.length > 0,
        incomeMissing: source.income === null,
    };
}

/**
 * Divide em `parts` partes que somam exatamente o valor; os centavos que sobram (positivos
 * ou negativos) vão para as primeiras partes. Mesma regra do back (summary.calculator.ts).
 */
export function splitEvenly(cents: number, parts: number): number[] {
    if (parts <= 0) {
        return [];
    }

    const base = Math.trunc(cents / parts);
    const remainder = cents - base * parts;
    const step = Math.sign(remainder);

    return Array.from({ length: parts }, (_, index) => base + (index < Math.abs(remainder) ? step : 0));
}

/**
 * Ajusta a divisão de cada linha para que a soma de cada pessoa seja `targets`. A diferença
 * (no máximo poucos centavos) vai para a linha que fica mais equilibrada; como as diferenças somam zero,
 * o total de cada linha não muda.
 */
export function reconcile(rows: readonly (readonly number[])[], targets: readonly number[]): number[][] {
    const result = rows.map((parts) => [...parts]);
    const rowTotal = (parts: readonly number[]): number => parts.reduce((total, part) => total + part, 0);

    if (result.length === 0) {
        return result;
    }

    const differences = targets.map(
        (target, person) => target - result.reduce((total, parts) => total + (parts[person] ?? 0), 0),
    );
    const spread = (parts: readonly number[]): number => Math.max(...parts) - Math.min(...parts);
    const adjusted = (parts: readonly number[]): number[] => parts.map((part, person) => part + differences[person]);
    // A linha que fica mais equilibrada depois do ajuste (em geral a que já tinha centavo ímpar);
    // no empate, a de maior valor.
    const chosen = result.reduce((best, parts, index) => {
        const current = spread(adjusted(parts));
        const bestSpread = spread(adjusted(result[best]));

        return current < bestSpread ||
            (current === bestSpread && Math.abs(rowTotal(parts)) > Math.abs(rowTotal(result[best])))
            ? index
            : best;
    }, 0);

    result[chosen] = adjusted(result[chosen]);

    return result;
}

interface RowValues {
    readonly total: number | null;
    readonly cells: readonly (number | null)[];
    readonly children?: readonly StatementRow[];
    readonly style?: StatementRowStyle;
}

function row(id: string, label: string, note: string | null, values: RowValues): StatementRow {
    return {
        id,
        label,
        note,
        total: values.total === null ? null : centsToAmount(values.total),
        cells: values.cells.map((cents) => (cents === null ? null : centsToAmount(cents))),
        children: values.children ?? [],
        style: values.style ?? 'item',
    };
}

/** Detalhe de um gasto compartilhado: só o total (a divisão já aparece na linha de cima). */
function detail(id: string, label: string, cents: number, width: number): StatementRow {
    return row(id, label, null, { total: cents, cells: Array.from({ length: width }, () => null), style: 'detail' });
}
