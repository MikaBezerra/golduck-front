import type { ApiSchemas } from '../../../core/api/api-types';

/**
 * Reserva do mês: quanto foi guardado (`month` é `"AAAA-MM"`, `amount` é texto em reais).
 * Nas contas é um gasto compartilhado: sai da entrada e é dividida igualmente entre as pessoas ativas.
 */
export type Reserve = ApiSchemas['ReserveResponse'];

/** Cadastra a mesma reserva em vários meses (1 a 12) do ano de uma vez. */
export type CreateReserveRequest = ApiSchemas['CreateReserveDto'];

export type UpdateReserveRequest = ApiSchemas['UpdateReserveDto'];

/** Soma de tudo o que já foi guardado e a soma de cada ano (só anos com reserva). */
export type ReserveTotals = ApiSchemas['ReserveTotalsResponse'];
