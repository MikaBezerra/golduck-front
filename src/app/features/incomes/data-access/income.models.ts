/** Espelha financas/src/modules/incomes/dto/income.dto.ts */

/** Entrada (receita) de um mês. Cada mês tem no máximo uma. */
export interface Income {
    readonly id: string;
    /** `"AAAA-MM"` */
    readonly month: string;
    /** Em reais, como texto: `"5000.00"` */
    readonly amount: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

/** Cria a mesma entrada em vários meses do ano de uma vez. */
export interface CreateIncomeRequest {
    readonly year: number;
    /** 1 a 12 */
    readonly months: number[];
    readonly amount: string;
}

export interface UpdateIncomeRequest {
    readonly amount: string;
}
