import type { ApiSchemas } from '../../../core/api/api-types';

export type CardExpenseInstallment = ApiSchemas['CardInstallmentDto'];

/**
 * Despesa lançada a partir da fatura do cartão. Só é criada ou removida por um envio de fatura.
 * `description` é o apelido, quando existir; senão, a descrição original do banco.
 * `installment` é `null` para compras à vista.
 */
export type CardExpense = ApiSchemas['CardExpenseResponse'];

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
