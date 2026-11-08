import type { ApiSchemas } from '../../../core/api/api-types';
import { addMonths, parseMonthKey } from '../../../shared/month/month';

/** Banco emissor: define o tradutor da sincronização e o formato da fatura no upload (NUBANK e C6 em CSV, NEON em PDF). */
export type CardBank = ApiSchemas['CardBank'];

/**
 * Cartão de crédito. O banco é definido na criação e não muda depois.
 * `dueDay`/`bestPurchaseDay` montam o ciclo da fatura; `pluggyItemId`/`syncFromMonth` ligam a
 * sincronização com o Meu Pluggy; `sync` é a situação da última tentativa.
 */
export type CreditCard = ApiSchemas['CreditCardResponse'];

/** Situação da sincronização do cartão (`sync` em `CreditCardResponse`). */
export type CreditCardSync = ApiSchemas['CreditCardSyncResponse'];

export type CreateCreditCardRequest = ApiSchemas['CreateCreditCardDto'];

/** O back não permite trocar o banco. `pluggyItemId: null` desliga a sincronização. */
export type UpdateCreditCardRequest = ApiSchemas['UpdateCreditCardDto'];

/** Ciclo de uma fatura (`GET /credit-cards/{id}/bills`). */
export type CreditCardBill = ApiSchemas['CreditCardBillResponse'];

/** De onde veio o melhor dia: `bank` (fechamento informado pelo banco), `user` (ajuste) ou `default` (padrão do cartão). */
export type CreditCardBillSource = CreditCardBill['source'];

/** `bestPurchaseDate: null` volta ao padrão do cartão. */
export type UpdateCreditCardBillRequest = ApiSchemas['UpdateCreditCardBillDto'];

/**
 * Quanto é a fatura e se já foi paga. `changedAfterPayment`: paga, mas o total mudou depois
 * (compra que chegou atrasada); marcar como paga de novo confirma o valor novo.
 */
export type CreditCardBillStatus = ApiSchemas['CreditCardBillStatusResponse'];

/**
 * Resumo das faturas do mês (`GET /credit-cards/bills/summary`): uma por cartão (ativos e os inativos
 * com compras no mês) e o total geral. `availableLimit` é o limite de hoje, qualquer que seja o mês.
 */
export type CreditCardBillsSummary = ApiSchemas['CreditCardBillsSummaryResponse'];

export type CreditCardBillSummaryItem = ApiSchemas['CreditCardBillSummaryItem'];

/** `open` (antes do fechamento), `closed` (fechada, a pagar), `overdue` (vencida) ou `paid`. */
export type BillStatus = CreditCardBillStatus['status'];

export const BILL_STATUS_LABELS: Readonly<Record<BillStatus, string>> = {
    open: 'Aberta',
    closed: 'Fechada · a pagar',
    overdue: 'Vencida',
    paid: 'Paga',
};

export const BILL_STATUS_SEVERITIES: Readonly<Record<BillStatus, 'info' | 'warn' | 'danger' | 'success'>> = {
    open: 'info',
    closed: 'warn',
    overdue: 'danger',
    paid: 'success',
};

/** Só fatura fechada (ou vencida) pode ser marcada como paga; a paga pode ser desmarcada. */
export function canMarkBillPaid(status: BillStatus): boolean {
    return status === 'closed' || status === 'overdue';
}

export const CARD_BANK_LABELS: Readonly<Record<CardBank, string>> = {
    NUBANK: 'Nubank',
    C6: 'C6 Bank',
    NEON: 'Neon',
};

export const CARD_BANK_OPTIONS = (Object.keys(CARD_BANK_LABELS) as CardBank[]).map((bank) => ({
    label: CARD_BANK_LABELS[bank],
    value: bank,
}));

export const BILL_SOURCE_LABELS: Readonly<Record<CreditCardBillSource, string>> = {
    bank: 'Fechamento informado pelo banco',
    user: 'Ajustado por você',
    default: 'Padrão do cartão',
};

/** Situações do item no Meu Pluggy; as desconhecidas aparecem como vieram. */
const PLUGGY_STATUS_LABELS: Readonly<Record<string, string>> = {
    UPDATED: 'Atualizado',
    UPDATING: 'Atualizando',
    OUTDATED: 'Desatualizado',
    LOGIN_ERROR: 'Autorização vencida ou recusada',
    WAITING_USER_INPUT: 'Esperando ação no Meu Pluggy',
    WAITING_USER_ACTION: 'Esperando ação no Meu Pluggy',
};

/** Situações em que os dados não estão chegando: merecem destaque. */
const PLUGGY_PROBLEM_STATUSES: ReadonlySet<string> = new Set([
    'OUTDATED',
    'LOGIN_ERROR',
    'WAITING_USER_INPUT',
    'WAITING_USER_ACTION',
]);

export function pluggyStatusLabel(status: string | null): string {
    return status ? (PLUGGY_STATUS_LABELS[status] ?? status) : '—';
}

export function isPluggyProblem(status: string | null): boolean {
    return status !== null && PLUGGY_PROBLEM_STATUSES.has(status);
}

/** Limite do back (VARCHAR 120). */
export const CREDIT_CARD_NAME_MAX_LENGTH = 120;

/** Dia do vencimento e melhor dia de compra: 1 a 31 (regra do back). */
export const BILLING_DAY_MIN = 1;
export const BILLING_DAY_MAX = 31;

/** A autorização do Open Finance vale 1 ano; avisa com este número de dias de antecedência. */
export const CONSENT_WARNING_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ConsentWarning {
    /** Dias até o fim da autorização (negativo: já venceu). */
    readonly daysLeft: number;
    readonly expired: boolean;
}

/** Aviso quando a autorização do Open Finance vence em até {@link CONSENT_WARNING_DAYS} dias (ou já venceu). */
export function consentWarning(sync: CreditCardSync, now: Date = new Date()): ConsentWarning | null {
    if (!sync.consentExpiresAt) {
        return null;
    }

    const expiresAt = Date.parse(sync.consentExpiresAt);

    if (Number.isNaN(expiresAt)) {
        return null;
    }

    const daysLeft = Math.ceil((expiresAt - now.getTime()) / DAY_MS);

    return daysLeft <= CONSENT_WARNING_DAYS ? { daysLeft, expired: daysLeft <= 0 } : null;
}

/** Texto curto do aviso: "vence em 12 dias", "vence amanhã", "venceu". */
export function describeConsentWarning(warning: ConsentWarning): string {
    if (warning.expired) {
        return 'A autorização do Open Finance venceu: autorize de novo no Meu Pluggy.';
    }

    const when = warning.daysLeft === 1 ? 'amanhã' : `em ${warning.daysLeft} dias`;

    return `A autorização do Open Finance vence ${when}: renove no Meu Pluggy para a sincronização continuar.`;
}

/** Ciclo da fatura configurado: dá para consultar o período (`GET /credit-cards/{id}/bills`). */
export function hasBillingCycle(card: CreditCard): boolean {
    return card.dueDay !== null && card.bestPurchaseDay !== null;
}

/**
 * Datas aceitas para o melhor dia de compra da fatura `month`: do início do mês anterior ao fim do
 * próprio mês (regra do back, `CREDIT_CARD_BILL_DATE_OUT_OF_RANGE`). Em `"AAAA-MM-DD"`.
 */
export function billDateRange(month: string): { readonly min: string; readonly max: string } {
    const { year, month: monthNumber } = parseMonthKey(month);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

    return { min: `${addMonths(month, -1)}-01`, max: `${month}-${String(lastDay).padStart(2, '0')}` };
}
