/** Espelha financas/src/modules/card-expenses/dto/card-expense.dto.ts */

export interface CardExpenseInstallment {
    readonly number: number;
    readonly total: number;
}

/** Despesa lançada a partir da fatura do cartão. Só é criada ou removida por um envio de fatura. */
export interface CardExpense {
    readonly id: string;
    readonly cardId: string;
    /** Envio de fatura que gravou esta linha por último. */
    readonly importId: string;
    /** Mês da fatura em que a despesa aparece: `"AAAA-MM"`. */
    readonly month: string;
    /** Data informada pelo banco: `"AAAA-MM-DD"`. */
    readonly transactionDate: string;
    /** Apelido, quando existir; senão, a descrição original do banco. */
    readonly description: string;
    readonly originalDescription: string;
    readonly nickname: string | null;
    readonly holderName: string | null;
    readonly cardLastDigits: string | null;
    /** Valor da parcela deste mês, em reais: `"98.45"` */
    readonly amount: string;
    /** `null` para compras à vista. */
    readonly installment: CardExpenseInstallment | null;
    readonly categoryId: string;
    readonly personId: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
}

/**
 * Só os campos enviados mudam. `nickname: null` remove o apelido; `personId: null` remove a pessoa.
 * Em compras parceladas, o back aplica a mudança também às parcelas seguintes.
 */
export interface CardExpenseChanges {
    nickname?: string | null;
    categoryId?: string;
    personId?: string | null;
}

export interface UpdateCardExpensesRequest {
    readonly ids: string[];
    readonly changes: CardExpenseChanges;
}

/** Limite do back para o apelido. */
export const CARD_EXPENSE_NICKNAME_MAX_LENGTH = 160;
