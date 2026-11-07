/*
 * Reserva do mês: quanto foi guardado. Entra nas contas como um gasto compartilhado
 * (sai da entrada e é dividida igualmente entre as pessoas ativas).
 *
 * TODO: o módulo `reserves` ainda não existe no back. Estes tipos seguem o contrato combinado
 * (igual ao de `incomes`). Quando o back tiver o endpoint, rode `npm run api:types` e troque por:
 *   export type Reserve = ApiSchemas['ReserveResponse'];
 *   export type CreateReserveRequest = ApiSchemas['CreateReserveDto'];
 *   export type UpdateReserveRequest = ApiSchemas['UpdateReserveDto'];
 */

export interface Reserve {
    readonly id: string;
    /** `"AAAA-MM"` */
    readonly month: string;
    /** Valor em reais, como texto (`"500.00"`). */
    readonly amount: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

/** Cadastra a mesma reserva em vários meses (1 a 12) do ano de uma vez. */
export interface CreateReserveRequest {
    readonly year: number;
    readonly months: readonly number[];
    readonly amount: string;
}

export interface UpdateReserveRequest {
    readonly amount: string;
}

/** Reservas do ano e se o back já tem o endpoint (`available: false` = ainda não implementado). */
export interface ReserveList {
    readonly available: boolean;
    readonly items: readonly Reserve[];
}
