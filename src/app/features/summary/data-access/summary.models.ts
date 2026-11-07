import type { ApiSchemas } from '../../../core/api/api-types';

/**
 * Resumo de um mês (`GET /summary?month=AAAA-MM`). Valores em reais como texto (`"1234.56"`);
 * `balance` e o líquido de cada pessoa podem ser negativos. Despesas do cartão entram pelo
 * mês da fatura, sem as excluídas.
 */
export type Summary = ApiSchemas['SummaryResponse'];

/** Total de uma categoria no mês (inclui categorias inativas que tiveram despesas). */
export type SummaryCategory = ApiSchemas['SummaryCategoryDto'];

/** Total de uma pessoa no mês; `personId` null são as despesas compartilhadas (sem pessoa). */
export type SummaryPerson = ApiSchemas['SummaryPersonDto'];

/** Líquido de uma pessoa ativa: parte da entrada (já sem as compartilhadas) menos as despesas individuais. */
export type SummaryNetByPerson = ApiSchemas['SummaryNetByPersonDto'];
