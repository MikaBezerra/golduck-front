import { amountRatio, amountToCents } from '../../../shared/money/money';
import type { SummaryCategory, SummaryNetByPerson, SummaryPerson } from './summary.models';

/*
 * Funções puras que preparam o resumo da API para a tela (sem Angular, fáceis de testar),
 * como um "mapper" de DTO para view model.
 */

/** Uma linha das listas com barra (por categoria, por pessoa). */
export interface BarItem {
    readonly id: string;
    readonly label: string;
    /** Observação curta ao lado do nome, ex.: `inativa`. */
    readonly note: string | null;
    readonly amount: string;
    readonly count: number;
    /** Largura da barra em %: valor ÷ maior valor da lista. */
    readonly width: number;
    /** Parte do total das despesas, já formatada (`"42%"`). */
    readonly share: string;
}

export interface NetRow extends SummaryNetByPerson {
    /** A pessoa gastou mais que a parte dela da entrada. */
    readonly negative: boolean;
}

/** Id usado na lista para as despesas sem pessoa (a API manda `personId: null`). */
export const SHARED_ID = 'compartilhadas';

/** `0.4231` → `"42%"`; valores entre 0 e 0,5% viram `"<1%"` para não parecer zero. */
export function formatPercent(ratio: number): string {
    if (ratio > 0 && ratio < 0.005) {
        return '<1%';
    }

    return `${Math.round(ratio * 100)}%`;
}

export function categoryBars(categories: readonly SummaryCategory[], total: string): BarItem[] {
    return toBars(
        categories.map((category) => ({
            id: category.categoryId,
            label: category.name,
            note: category.active ? null : 'inativa',
            amount: category.amount,
            count: category.count,
        })),
        total,
    );
}

export function personBars(people: readonly SummaryPerson[], total: string): BarItem[] {
    return toBars(
        people.map((person) => ({
            id: person.personId ?? SHARED_ID,
            label: person.personId === null ? 'Compartilhadas' : (person.name ?? 'Pessoa'),
            note: person.personId === null ? 'sem pessoa' : person.active === false ? 'inativa' : null,
            amount: person.amount,
            count: person.count,
        })),
        total,
    );
}

export function netRows(rows: readonly SummaryNetByPerson[]): NetRow[] {
    return rows.map((row) => ({ ...row, negative: amountToCents(row.net) < 0 }));
}

type BarSource = Pick<BarItem, 'id' | 'label' | 'note' | 'amount' | 'count'>;

/** A API já manda em ordem decrescente de valor; a maior barra ocupa a largura toda. */
function toBars(items: readonly BarSource[], total: string): BarItem[] {
    const largest = items.reduce((max, item) => Math.max(max, amountToCents(item.amount)), 0);

    return items.map((item) => {
        const cents = amountToCents(item.amount);
        // Valores muito pequenos ainda aparecem como um traço (1%).
        const width = largest > 0 && cents > 0 ? Math.max(1, (cents / largest) * 100) : 0;

        return { ...item, width, share: formatPercent(amountRatio(item.amount, total)) };
    });
}
