/** Espelha financas/src/modules/manual-expenses/dto/manual-expense.dto.ts */

export interface ManualExpense {
    readonly id: string;
    /** `"AAAA-MM"` */
    readonly month: string;
    readonly title: string;
    /** Em reais, como texto: `"150.00"` */
    readonly amount: string;
    readonly categoryId: string;
    readonly personId: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface CreateManualExpenseRequest {
    readonly month: string;
    readonly title: string;
    readonly amount: string;
    /** Sem categoria, o back usa a categoria padrão ("Outros"). */
    readonly categoryId?: string;
    readonly personId?: string | null;
    /** Cria uma cópia em cada mês, do mês informado até dezembro. */
    readonly replicateUntilYearEnd?: boolean;
}

/** Só os campos enviados são alterados. `personId: null` remove a pessoa. */
export interface ManualExpenseChanges {
    title?: string;
    amount?: string;
    categoryId?: string;
    personId?: string | null;
}

/** Altera uma ou várias despesas de uma vez. */
export interface UpdateManualExpensesRequest {
    readonly ids: string[];
    readonly changes: ManualExpenseChanges;
}

/** Limite do back (VARCHAR 160). */
export const EXPENSE_TITLE_MAX_LENGTH = 160;
