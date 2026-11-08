import type { ApiSchemas } from '../../../core/api/api-types';

export type CardExpenseInstallment = ApiSchemas['CardInstallmentDto'];

/**
 * Despesa de uma fatura do cartão. `origin` diz de onde veio: `SYNC` (sincronização com o Meu
 * Pluggy), `UPLOAD` (envio de fatura; só nesse caso `importId` vem preenchido) ou `MANUAL`
 * ("Adicionar compra"). `description` é o apelido, quando existir; senão, a descrição original do
 * banco. `installment` é `null` para compras à vista.
 */
export type CardExpense = ApiSchemas['CardExpenseResponse'];

export type CardExpenseOrigin = CardExpense['origin'];

/** "Adicionar compra": uma compra que está faltando na fatura. Parcelada, lança também as parcelas seguintes. */
export type CreateCardExpenseRequest = ApiSchemas['CreateCardExpenseDto'];

/**
 * Mudar de fatura ou de parcela: a linha passa a ser a parcela informada no mês informado e as
 * outras parcelas seguem a partir dela. Parcela e total omitidos = os atuais.
 */
export type MoveCardExpenseRequest = ApiSchemas['MoveCardExpenseDto'];

export const CARD_EXPENSE_ORIGIN_LABELS: Readonly<Record<CardExpenseOrigin, string>> = {
    SYNC: 'Sincronizada',
    UPLOAD: 'Fatura enviada',
    MANUAL: 'Adicionada à mão',
};

/** Compras de upload não mudam de fatura (o back responde `409 CARD_EXPENSE_MOVE_NOT_ALLOWED`). */
export function canMoveCardExpense(expense: CardExpense): boolean {
    return expense.origin !== 'UPLOAD';
}

/**
 * Só os campos enviados mudam. `nickname: null` remove o apelido; `personId: null` remove a pessoa.
 * Em compras parceladas, o back aplica a mudança também às parcelas seguintes.
 */
export type CardExpenseChanges = ApiSchemas['CardExpenseChangesDto'];

export type UpdateCardExpensesRequest = ApiSchemas['UpdateCardExpensesDto'];

/**
 * Parcelas afetadas ao excluir ou restaurar, a partir do mês da linha:
 * `month` (só ela), `forward` (ela e as seguintes), `backward` (ela e as anteriores), `all` (todas).
 * Em compras à vista, o back considera só a própria linha.
 */
export type CardExpenseScope = ApiSchemas['CardExpenseScopeDto']['scope'];

/** Corpo de `DELETE /card-expenses` e `POST /card-expenses/restore`. */
export type CardExpenseScopeRequest = ApiSchemas['CardExpenseScopeDto'];

export const CARD_EXPENSE_SCOPE_OPTIONS: readonly { readonly label: string; readonly value: CardExpenseScope }[] = [
    { label: 'Todas as parcelas da compra', value: 'all' },
    { label: 'Esta parcela e as próximas', value: 'forward' },
    { label: 'Esta parcela e as anteriores', value: 'backward' },
    { label: 'Só esta parcela', value: 'month' },
];

/** Limite do back para o apelido. */
export const CARD_EXPENSE_NICKNAME_MAX_LENGTH = 160;

/** Limite do back para a descrição de "Adicionar compra". */
export const CARD_EXPENSE_DESCRIPTION_MAX_LENGTH = 200;

/** Parcelas: 1 a 99 (regra do back). */
export const MAX_INSTALLMENTS = 99;
