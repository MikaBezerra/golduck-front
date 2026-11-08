import type { ApiSchemas } from '../../core/api/api-types';

/**
 * De quem é a despesa (campo `split` do back):
 * - `PENDING`: compra do cartão que chegou pela sincronização ou pelo upload e ninguém classificou.
 *   Conta como compartilhada no resumo, mas o envio do resumo por e-mail fica bloqueado;
 * - `SHARED`: compartilhada, dividida entre as pessoas ativas;
 * - `PERSONAL`: individual, de `personId`.
 *
 * Nos formulários, um select só ("Compartilhada" + as pessoas) guarda a escolha: o valor é o id da
 * pessoa ou `SHARED_CHOICE`. Os ids de pessoa são UUIDs, então não se confundem com ele.
 */
export type ExpenseSplit = ApiSchemas['CardExpenseResponse']['split'];

/** O que o usuário pode escolher (pendente só nasce no back). */
export type ChosenSplit = Exclude<ExpenseSplit, 'PENDING'>;

/** Corpo que vai ao back: `split` e, só no individual, `personId`. */
export type SplitChoice = { split: 'SHARED' } | { split: 'PERSONAL'; personId: string };

export const SHARED_CHOICE = 'SHARED';

export const SHARED_LABEL = 'Compartilhada';

export const PENDING_LABEL = 'Sem pessoa';

export interface PersonChoiceOption {
    readonly label: string;
    readonly value: string;
}

/** Escolha do select para a despesa: o id da pessoa, `SHARED_CHOICE` ou `null` (pendente). */
export function choiceOf(expense: { readonly split: ExpenseSplit; readonly personId: string | null }): string | null {
    if (expense.split === 'PERSONAL') {
        return expense.personId;
    }

    return expense.split === 'SHARED' ? SHARED_CHOICE : null;
}

/** O que mandar ao back para a escolha do select. */
export function splitOfChoice(choice: string): SplitChoice {
    return choice === SHARED_CHOICE ? { split: 'SHARED' } : { split: 'PERSONAL', personId: choice };
}

/** "Compartilhada" primeiro, depois as pessoas. */
export function personChoiceOptions(people: readonly PersonChoiceOption[]): PersonChoiceOption[] {
    return [{ label: SHARED_LABEL, value: SHARED_CHOICE }, ...people];
}

/** Texto da pessoa numa lista: o nome, "Compartilhada" ou "Sem pessoa". */
export function splitLabel(
    expense: { readonly split: ExpenseSplit; readonly personId: string | null },
    nameOf: (personId: string) => string | undefined,
): string {
    if (expense.split === 'PENDING') {
        return PENDING_LABEL;
    }

    if (expense.split === 'SHARED' || expense.personId === null) {
        return SHARED_LABEL;
    }

    return nameOf(expense.personId) ?? '…';
}
