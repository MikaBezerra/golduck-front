import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import type { AbstractControl, ValidationErrors } from '@angular/forms';
import { map, startWith, switchMap } from 'rxjs';

type MessageFactory = (error: unknown) => string;

const DEFAULT_MESSAGES: Readonly<Record<string, MessageFactory>> = {
    required: () => 'Campo obrigatório',
    email: () => 'Informe um e-mail válido',
    maxlength: (error) => `Use no máximo ${(error as { requiredLength: number }).requiredLength} caracteres`,
    minlength: (error) => `Use pelo menos ${(error as { requiredLength: number }).requiredLength} caracteres`,
    min: (error) => `O valor mínimo é ${(error as { min: number }).min}`,
    max: (error) => `O valor máximo é ${(error as { max: number }).max}`,
    pattern: () => 'Formato inválido',
    server: (error) => String(error),
};

interface FirstError {
    readonly key: string;
    readonly value: unknown;
}

/**
 * Mostra a mensagem de erro de um campo de formulário, em português.
 *
 * Uso: `<app-field-error [control]="form.controls.name" />`
 * Mensagens próprias: `[messages]="{ pattern: 'Use o formato +5511999999999' }"`
 */
@Component({
    selector: 'app-field-error',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (message(); as text) {
            <small class="mt-1 block text-sm text-red-400" role="alert">{{ text }}</small>
        }
    `,
})
export class FieldErrorComponent {
    public readonly control = input.required<AbstractControl>();
    public readonly messages = input<Readonly<Record<string, string>>>({});

    /** Reage a qualquer mudança no campo (valor, status, foco) e guarda o primeiro erro visível. */
    private readonly firstError = toSignal(
        toObservable(this.control).pipe(
            switchMap((control) =>
                control.events.pipe(
                    startWith(null),
                    map(() => readFirstError(control)),
                ),
            ),
        ),
        { initialValue: null },
    );

    protected readonly message = computed(() => {
        const error = this.firstError();

        if (!error) {
            return null;
        }

        return this.messages()[error.key] ?? DEFAULT_MESSAGES[error.key]?.(error.value) ?? 'Valor inválido';
    });
}

function readFirstError(control: AbstractControl): FirstError | null {
    const errors: ValidationErrors | null = control.errors;

    if (!errors || !(control.touched || control.dirty)) {
        return null;
    }

    const [key] = Object.keys(errors);

    return key ? { key, value: errors[key] } : null;
}
