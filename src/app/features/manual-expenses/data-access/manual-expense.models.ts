import type { ApiSchemas } from '../../../core/api/api-types';

/** Despesa lançada à mão: `month` é `"AAAA-MM"` e `amount` é texto em reais (`"150.00"`). */
export type ManualExpense = ApiSchemas['ManualExpenseResponse'];

/**
 * Sem `categoryId`, o back usa a categoria padrão ("Outros"). `split` é obrigatório (`SHARED`, ou
 * `PERSONAL` + `personId`): despesa manual nunca fica pendente.
 * `replicateUntilYearEnd` cria uma cópia em cada mês, do mês informado até dezembro.
 */
export type CreateManualExpenseRequest = ApiSchemas['CreateManualExpenseDto'];

/**
 * Só os campos enviados são alterados. A pessoa muda com `split` (`SHARED`, ou `PERSONAL` + `personId`):
 * veja `shared/expense-split`.
 */
export type ManualExpenseChanges = ApiSchemas['ManualExpenseChangesDto'];

/** Altera uma ou várias despesas de uma vez. */
export type UpdateManualExpensesRequest = ApiSchemas['UpdateManualExpensesDto'];

/** Limite do back (VARCHAR 160). */
export const EXPENSE_TITLE_MAX_LENGTH = 160;
