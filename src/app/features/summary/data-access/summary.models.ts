import type { ApiSchemas } from '../../../core/api/api-types';

/**
 * Resumo de um mês (`GET /summary?month=AAAA-MM`). Valores em reais como texto (`"1234.56"`);
 * `balance` e o líquido de cada pessoa podem ser negativos. Despesas do cartão entram pelo
 * mês da fatura, sem as excluídas.
 */
export type Summary = ApiSchemas['SummaryResponse'];

/**
 * Resumo do ano (`GET /summary/annual?year=AAAA`): os mesmos totais do mensal somados nos
 * 12 meses, mais `months` (sempre de janeiro a dezembro, inclusive os vazios) para os gráficos.
 * No anual, o líquido de cada pessoa é a soma dos líquidos de cada mês.
 */
export type AnnualSummary = ApiSchemas['AnnualSummaryResponse'];

/** Um mês da lista do resumo anual: entrada, despesas e saldo. */
export type SummaryMonth = ApiSchemas['SummaryMonthDto'];

/** O que o mensal e o anual têm em comum (totais, por origem, categoria, pessoa e líquido). */
export type SummaryTotals = Omit<Summary, 'month'>;

/** Compras do cartão ainda sem pessoa: contam como compartilhadas e bloqueiam o envio por e-mail. */
export type SummaryPending = ApiSchemas['SummaryPendingDto'];

/** Total de uma categoria no período (inclui categorias inativas que tiveram despesas). */
export type SummaryCategory = ApiSchemas['SummaryCategoryDto'];

/** Total de uma pessoa no período; `personId` null são as despesas compartilhadas (sem pessoa). */
export type SummaryPerson = ApiSchemas['SummaryPersonDto'];

/** Líquido de uma pessoa ativa: parte da entrada (já sem as compartilhadas) menos as despesas individuais. */
export type SummaryNetByPerson = ApiSchemas['SummaryNetByPersonDto'];

/**
 * Resumo do mês em tabela (`GET /summary/statement?month=AAAA-MM`), pronto do back: uma coluna por
 * pessoa (`columns`), as seções com as linhas (`total` e um valor por coluna em `cells`, na mesma ordem
 * de `columns`), a quebra do líquido de cada pessoa (`breakdown`) e a reserva do mês e acumulada.
 * O front só formata e mostra.
 */
export type SummaryStatement = ApiSchemas['SummaryStatementResponse'];

/**
 * Uma linha da tabela. `null` em `total` ou numa célula = não se aplica ("—"). O OpenAPI do back
 * descreve `cells` como `string[] | null`, mas o que pode ser `null` é cada valor, então a tela
 * sempre confere célula por célula.
 */
export type SummaryStatementRow = ApiSchemas['SummaryStatementRowDto'];

/** O resumo mostra um mês ou o ano inteiro. */
export type SummaryMode = 'month' | 'year';

export const SUMMARY_MODE_OPTIONS: readonly { readonly label: string; readonly value: SummaryMode }[] = [
    { label: 'Mês', value: 'month' },
    { label: 'Ano', value: 'year' },
];
