/**
 * Dinheiro na API trafega como texto em reais com ponto decimal: `"1234.56"`.
 *
 * Regra de ouro: nunca somar valores como `number` com casas decimais
 * (0.1 + 0.2 = 0.30000000000000004). Para somar, converta para centavos
 * inteiros, some, e converta de volta.
 */

const AMOUNT_PATTERN = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** `"1234.56"` → `123456` */
export function amountToCents(amount: string): number {
    const match = AMOUNT_PATTERN.exec(amount.trim());

    if (!match) {
        throw new Error(`Valor em formato inesperado: "${amount}"`);
    }

    const [, sign, whole, fraction = ''] = match;
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));

    return sign ? -cents : cents;
}

/** `123456` → `"1234.56"` */
export function centsToAmount(cents: number): string {
    const sign = cents < 0 ? '-' : '';
    const absolute = Math.abs(Math.round(cents));
    const whole = Math.trunc(absolute / 100);
    const fraction = String(absolute % 100).padStart(2, '0');

    return `${sign}${whole}.${fraction}`;
}

/** Soma valores da API sem erro de arredondamento: `["0.10", "0.20"]` → `"0.30"` */
export function sumAmounts(amounts: readonly string[]): string {
    return centsToAmount(amounts.reduce((total, amount) => total + amountToCents(amount), 0));
}

/** Valor digitado no campo de moeda (`1234.5`) → formato da API (`"1234.50"`). */
export function numberToAmount(value: number): string {
    return centsToAmount(Math.round(value * 100));
}

/** Formato da API (`"1234.56"`) → número para preencher o campo de moeda (`1234.56`). */
export function amountToNumber(amount: string): number {
    return amountToCents(amount) / 100;
}

/** `"1234.56"` → `"R$ 1.234,56"` */
export function formatBrl(amount: string): string {
    return BRL.format(amountToCents(amount) / 100);
}
