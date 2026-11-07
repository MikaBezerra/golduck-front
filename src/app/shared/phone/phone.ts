import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Formato exigido pelo back (E.164): `+` código do país e número, só dígitos.
 * O back aceita de 2 a 15 dígitos; aqui exigimos pelo menos 8 para barrar números incompletos.
 */
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

/**
 * Converte o que a pessoa digitou para o formato da API.
 *
 * - `(11) 99999-9999` → `+5511999999999` (sem código do país, assume Brasil)
 * - `+1 415 555 2671` → `+14155552671`
 * - vazio → `null`
 */
export function normalizePhone(input: string): string | null {
    const trimmed = input.trim();

    if (!trimmed) {
        return null;
    }

    const digits = trimmed.replace(/\D/g, '');

    if (trimmed.startsWith('+')) {
        return `+${digits}`;
    }

    // DDD + número (10 ou 11 dígitos): número brasileiro sem o +55.
    if (digits.length === 10 || digits.length === 11) {
        return `+55${digits}`;
    }

    return `+${digits}`;
}

export function isValidPhone(input: string): boolean {
    const normalized = normalizePhone(input);

    return normalized === null || E164_PATTERN.test(normalized);
}

/** Validador de formulário: aceita vazio ou um telefone que vire E.164 válido. */
export const phoneValidator: ValidatorFn = (control: AbstractControl<string>): ValidationErrors | null =>
    isValidPhone(control.value ?? '') ? null : { phone: true };

/** `+5511999999999` → `+55 (11) 99999-9999`. Números de outros países ficam como estão. */
export function formatPhone(phone: string): string {
    const match = /^\+55(\d{2})(\d{4,5})(\d{4})$/.exec(phone);

    return match ? `+55 (${match[1]}) ${match[2]}-${match[3]}` : phone;
}
