import type { ApiSchemas } from '../../../core/api/api-types';

/** Entrada (receita) de um mês: `month` é `"AAAA-MM"` e `amount` é texto em reais (`"5000.00"`). */
export type Income = ApiSchemas['IncomeResponse'];

/** Cria a mesma entrada em vários meses (1 a 12) do ano de uma vez. */
export type CreateIncomeRequest = ApiSchemas['CreateIncomeDto'];

export type UpdateIncomeRequest = ApiSchemas['UpdateIncomeDto'];
