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

/** Limite do back para o apelido. */
export const CARD_EXPENSE_NICKNAME_MAX_LENGTH = 160;
