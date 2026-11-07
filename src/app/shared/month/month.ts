/**
 * Meses na API trafegam como `"AAAA-MM"` (ex.: `"2026-11"`).
 * Aqui ficam as conversões entre esse texto, `Date` e o que aparece na tela.
 */

export const MONTH_NAMES = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
] as const;

const MONTH_KEY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export interface MonthParts {
    readonly year: number;
    /** 1 a 12 */
    readonly month: number;
}

export function isMonthKey(value: string): boolean {
    return MONTH_KEY_PATTERN.test(value);
}

export function parseMonthKey(key: string): MonthParts {
    const match = MONTH_KEY_PATTERN.exec(key);

    if (!match) {
        throw new Error(`Mês em formato inesperado: "${key}"`);
    }

    return { year: Number(match[1]), month: Number(match[2]) };
}

export function toMonthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
}

/** Mês de uma data, no fuso do navegador. */
export function dateToMonthKey(date: Date): string {
    return toMonthKey(date.getFullYear(), date.getMonth() + 1);
}

/** Primeiro dia do mês, no fuso do navegador (para preencher seletores de data). */
export function monthKeyToDate(key: string): Date {
    const { year, month } = parseMonthKey(key);

    return new Date(year, month - 1, 1);
}

export function currentMonthKey(today: Date = new Date()): string {
    return dateToMonthKey(today);
}

export function addMonths(key: string, delta: number): string {
    const { year, month } = parseMonthKey(key);
    const index = year * 12 + (month - 1) + delta;

    return toMonthKey(Math.floor(index / 12), (index % 12) + 1);
}

/** `"2026-11"` → `"Novembro de 2026"` */
export function formatMonth(key: string): string {
    const { year, month } = parseMonthKey(key);
    const name = MONTH_NAMES[month - 1];

    return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${year}`;
}

/** `"2026-11"` → `"nov/2026"` */
export function formatMonthShort(key: string): string {
    const { year, month } = parseMonthKey(key);

    return `${MONTH_NAMES[month - 1].slice(0, 3)}/${year}`;
}
