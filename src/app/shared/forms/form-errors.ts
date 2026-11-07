import type { AbstractControl } from '@angular/forms';

import { ApiError } from '../../core/api/api-error';

/**
 * Marca todos os campos como tocados e alterados, para que os erros
 * apareçam de uma vez quando o usuário tenta salvar um formulário incompleto.
 */
export function revealFormErrors(form: AbstractControl): void {
    form.markAllAsTouched();
    form.markAllAsDirty();
}

/** Coloca uma mensagem vinda do servidor embaixo de um campo específico. */
export function setServerError(control: AbstractControl | null, message: string): void {
    if (!control) {
        return;
    }

    control.setErrors({ ...(control.errors ?? {}), server: message });
    control.markAsTouched();
    control.markAsDirty();
}

/**
 * Distribui os erros de validação do back (`details[]`) pelos campos do formulário.
 *
 * O back informa o campo como `name`, `changes.amount`, `months[0]` ou
 * `transactions[2].amount`. Índices viram posições de `FormArray`
 * (`transactions.2.amount`); se não houver lista no formulário, o índice é ignorado
 * (`months[0]` → `months`).
 * Quando o nome no formulário é diferente do nome na API, use `fieldMap`
 * (ex.: `{ 'changes.amount': 'amount' }`).
 *
 * @returns `true` se ao menos um erro foi encaixado em algum campo.
 */
export function applyServerErrors(
    form: AbstractControl,
    error: unknown,
    fieldMap: Readonly<Record<string, string>> = {},
): boolean {
    const apiError = ApiError.from(error);
    let applied = false;

    for (const detail of apiError.details) {
        const withoutIndex = detail.field.replace(/\[\d+\]/g, '');
        const withArrayIndex = detail.field.replace(/\[(\d+)\]/g, '.$1');
        const mapped = fieldMap[detail.field] ?? fieldMap[withoutIndex];
        const control = mapped ? form.get(mapped) : (form.get(withArrayIndex) ?? form.get(withoutIndex));

        if (control) {
            setServerError(control, detail.message);
            applied = true;
        }
    }

    return applied;
}
