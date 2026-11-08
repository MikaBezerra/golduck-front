import type { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Validador do grupo com `installmentNumber` e `installmentTotal`: a parcela é opcional, mas,
 * se informada, precisa de número e total, com número ≤ total (as mesmas regras do back).
 */
export function installmentPairValidator(group: AbstractControl): ValidationErrors | null {
    const number: unknown = group.get('installmentNumber')?.value;
    const total: unknown = group.get('installmentTotal')?.value;

    if ((number === null) !== (total === null)) {
        return { installment: 'Informe a parcela e o total, ou deixe os dois vazios' };
    }

    if (typeof number === 'number' && typeof total === 'number' && number > total) {
        return { installment: 'A parcela não pode ser maior que o total' };
    }

    return null;
}
