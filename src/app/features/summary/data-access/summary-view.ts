import { amountRatio, amountToCents, centsToAmount, formatBrl } from '../../../shared/money/money';
import { formatMonth, formatMonthShort, parseMonthKey } from '../../../shared/month/month';
import type { SummaryCategory, SummaryMonth, SummaryNetByPerson, SummaryPerson } from './summary.models';

/*
 * Funções puras que preparam o resumo da API para a tela (sem Angular, fáceis de testar),
 * como um "mapper" de DTO para view model.
 */

// ---------- Listas com barra (por categoria, por pessoa) ----------

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

// ---------- Líquido por pessoa ----------

export interface NetCard extends SummaryNetByPerson {
    /** A pessoa gastou mais que a parte dela da entrada. */
    readonly negative: boolean;
    /** Quanto da parte as despesas individuais consumiram, em % (no máximo 100), para o medidor. */
    readonly usage: number;
    readonly initial: string;
}

export function netCards(rows: readonly SummaryNetByPerson[]): NetCard[] {
    return rows.map((row) => {
        const ratio = amountRatio(row.individual, row.share);
        const negative = amountToCents(row.net) < 0;

        return {
            ...row,
            negative,
            // Parte zerada ou negativa: qualquer despesa já passa do limite.
            usage: amountToCents(row.share) > 0 ? Math.min(100, ratio * 100) : negative ? 100 : 0,
            initial: row.name.charAt(0).toUpperCase(),
        };
    });
}

// ---------- Comparação com o mês anterior ----------

export interface AmountDelta {
    readonly direction: 'up' | 'down' | 'same';
    /** Diferença sem sinal, no formato da API. */
    readonly amount: string;
}

export function amountDelta(current: string, previous: string): AmountDelta {
    const difference = amountToCents(current) - amountToCents(previous);

    return {
        direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'same',
        amount: centsToAmount(Math.abs(difference)),
    };
}

// ---------- Gráfico do ano (barras agrupadas por mês) ----------

export interface ChartTick {
    /** Rótulo curto do eixo, ex.: `2 mil`. */
    readonly label: string;
    /** Altura da linha de grade, em % da área do gráfico (0 = base). */
    readonly position: number;
}

export interface ChartPoint {
    /** `"2026-07"` */
    readonly month: string;
    /** `jul` */
    readonly shortLabel: string;
    /** `J` (rótulo do celular) */
    readonly initial: string;
    /** `Julho de 2026` */
    readonly longLabel: string;
    readonly income: string | null;
    readonly expenses: string;
    /** null = sem reserva no mês. */
    readonly reserve: string | null;
    readonly balance: string;
    /** Alturas das barras, em % da área do gráfico. A reserva vai empilhada sobre as despesas. */
    readonly incomeHeight: number;
    readonly expenseHeight: number;
    readonly reserveHeight: number;
    readonly negative: boolean;
    /** Sem entrada, sem despesas e sem reserva. */
    readonly empty: boolean;
    /** Descrição completa para leitores de tela. */
    readonly ariaLabel: string;
}

export interface YearChart {
    readonly points: readonly ChartPoint[];
    readonly ticks: readonly ChartTick[];
    /** Nenhum mês tem entrada ou despesa. */
    readonly empty: boolean;
}

const COMPACT = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

/** `250000` centavos → `"2,5 mil"` (rótulos do eixo). */
export function formatCompact(cents: number): string {
    return COMPACT.format(cents / 100);
}

/**
 * Escala "redonda" do eixo: passo de 1, 2, 2,5 ou 5 × 10ⁿ reais, com 3 ou 4 intervalos
 * e um pouco de folga acima do maior valor. Devolve o topo e o passo, em centavos.
 */
export function niceScale(maxCents: number): { readonly max: number; readonly step: number } {
    if (maxCents <= 0) {
        return { max: 0, step: 0 };
    }

    const rough = (maxCents * 1.05) / 4;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const step =
        [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((value) => value >= rough) ?? 10 * magnitude;

    return { max: Math.ceil((maxCents * 1.05) / step) * step, step };
}

export function yearChart(months: readonly SummaryMonth[]): YearChart {
    const cents = (amount: string | null): number => (amount === null ? 0 : amountToCents(amount));
    // A entrada e a pilha (despesas + reserva) usam a mesma escala.
    const largest = months.reduce(
        (max, month) => Math.max(max, cents(month.income), cents(month.expensesTotal) + cents(month.reserve)),
        0,
    );
    const scale = niceScale(largest);
    const height = (amount: string | null): number =>
        scale.max > 0 && amount !== null ? Math.max(0, (amountToCents(amount) / scale.max) * 100) : 0;
    const ticks: ChartTick[] = [];

    for (let value = 0; scale.step > 0 && value <= scale.max; value += scale.step) {
        ticks.push({ label: formatCompact(value), position: (value / scale.max) * 100 });
    }

    const points = months.map((month) => {
        const longLabel = formatMonth(month.month);
        const shortLabel = formatMonthShort(month.month).split('/')[0];
        const income = month.income === null ? 'entrada não cadastrada' : `entrada ${formatBrl(month.income)}`;
        const reserve = month.reserve === null ? '' : `, reserva ${formatBrl(month.reserve)}`;

        return {
            month: month.month,
            shortLabel,
            initial: shortLabel.charAt(0).toUpperCase(),
            longLabel,
            income: month.income,
            expenses: month.expensesTotal,
            reserve: month.reserve,
            balance: month.balance,
            incomeHeight: height(month.income),
            expenseHeight: height(month.expensesTotal),
            reserveHeight: height(month.reserve),
            negative: amountToCents(month.balance) < 0,
            empty: month.income === null && month.expensesCount === 0 && month.reserve === null,
            ariaLabel:
                `${longLabel}: ${income}, despesas ${formatBrl(month.expensesTotal)}${reserve}, ` +
                `saldo ${formatBrl(month.balance)}`,
        };
    });

    return { points, ticks, empty: largest === 0 };
}

/** Número do mês (1 a 12) de `"AAAA-MM"`, para achar o ponto no gráfico. */
export function monthIndex(key: string): number {
    return parseMonthKey(key).month - 1;
}

// ---------- Minigráfico de linha (sparkline) dos cartões de números ----------

export interface Sparkline {
    /** Pontos do `<polyline>` num quadro de 100 × 32. */
    readonly points: string;
    /** Altura da linha do zero no mesmo quadro. */
    readonly zeroY: number;
    /** Posição horizontal (0 a 100) do ponto destacado. */
    readonly markerX: number | null;
}

/** Linha dos valores (centavos) com o zero sempre visível; destaca o ponto `markerIndex`. */
export function sparkline(values: readonly number[], markerIndex: number | null = null): Sparkline {
    const top = 2;
    const bottom = 30;
    const max = Math.max(0, ...values);
    const min = Math.min(0, ...values);
    const range = max - min || 1;
    const x = (index: number): number => (values.length > 1 ? (index / (values.length - 1)) * 100 : 50);
    const y = (value: number): number => bottom - ((value - min) / range) * (bottom - top);

    return {
        points: values.map((value, index) => `${round(x(index))},${round(y(value))}`).join(' '),
        zeroY: round(y(0)),
        markerX: markerIndex === null || markerIndex < 0 || markerIndex >= values.length ? null : round(x(markerIndex)),
    };
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}
