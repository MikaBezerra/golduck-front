import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    model,
    output,
    signal,
    untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { MultiSelect } from 'primeng/multiselect';
import type { Observable } from 'rxjs';

import { ApiError } from '../../../core/api/api-error';
import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { applyServerErrors, revealFormErrors, setServerError } from '../../../shared/forms/form-errors';
import { amountToNumber, numberToAmount } from '../../../shared/money/money';
import { MONEY_ERROR_MESSAGES, MONEY_MAX, moneyValidators } from '../../../shared/money/money-input';
import { formatMonth, MONTH_NAMES } from '../../../shared/month/month';
import { MonthPipe } from '../../../shared/month/month.pipe';
import { ReserveService } from '../../reserves/data-access/reserve.service';
import { IncomeService } from '../data-access/income.service';

/** Valor mensal que o diálogo cadastra: a entrada ou a reserva (mesmas regras na API). */
export type MonthlyAmountKind = 'income' | 'reserve';

/** O que o diálogo precisa de uma entrada ou reserva já cadastrada. */
export interface MonthlyAmount {
    readonly month: string;
    readonly amount: string;
}

interface KindTexts {
    /** "entrada" / "reserva" */
    readonly noun: string;
    readonly conflictCode: string;
    readonly invalidAmountCode: string;
}

const KINDS: Record<MonthlyAmountKind, KindTexts> = {
    income: { noun: 'entrada', conflictCode: 'INCOME_MONTH_CONFLICT', invalidAmountCode: 'INCOME_INVALID_AMOUNT' },
    reserve: { noun: 'reserva', conflictCode: 'RESERVE_MONTH_CONFLICT', invalidAmountCode: 'RESERVE_INVALID_AMOUNT' },
};

interface MonthOption {
    readonly label: string;
    readonly value: number;
    readonly disabled: boolean;
}

/**
 * Cadastra a mesma entrada (ou reserva) em vários meses do ano, edita o valor de um mês
 * ou o exclui. Entrada e reserva têm exatamente as mesmas regras, por isso um diálogo só.
 */
@Component({
    selector: 'app-monthly-amount-form-dialog',
    imports: [ReactiveFormsModule, Button, Dialog, InputNumber, MultiSelect, FieldErrorComponent, MonthPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './monthly-amount-form-dialog.component.html',
})
export class MonthlyAmountFormDialogComponent {
    public readonly visible = model(false);
    public readonly kind = input<MonthlyAmountKind>('income');
    public readonly year = input.required<number>();
    /** Valor a editar; `null` para cadastrar. */
    public readonly entry = input<MonthlyAmount | null>(null);
    /** Meses (1–12) que já têm valor no ano: aparecem bloqueados. */
    public readonly takenMonths = input<readonly number[]>([]);
    /** Meses já marcados ao abrir (ex.: clicou em "Adicionar" numa linha). */
    public readonly presetMonths = input<readonly number[]>([]);
    /** Salvou ou excluiu: a tela recarrega a lista. */
    public readonly saved = output();

    private readonly incomes = inject(IncomeService);
    private readonly reserves = inject(ReserveService);
    private readonly notifications = inject(NotificationService);
    private readonly confirm = inject(ConfirmService);

    protected readonly moneyMax = MONEY_MAX;
    protected readonly moneyMessages = MONEY_ERROR_MESSAGES;
    protected readonly saving = signal(false);
    protected readonly noun = computed(() => KINDS[this.kind()].noun);
    protected readonly header = computed(() => `${this.entry() ? 'Editar' : 'Nova'} ${this.noun()}`);
    protected readonly monthOptions = computed<MonthOption[]>(() =>
        MONTH_NAMES.map((name, index) => ({
            label: `${name.charAt(0).toUpperCase()}${name.slice(1)}`,
            value: index + 1,
            disabled: this.takenMonths().includes(index + 1),
        })),
    );

    protected readonly form = new FormGroup({
        months: new FormControl<number[]>([], { nonNullable: true, validators: [Validators.required] }),
        amount: new FormControl<number | null>(null, moneyValidators),
    });

    public constructor() {
        effect(() => {
            if (!this.visible()) {
                return;
            }

            const entry = this.entry();
            const preset = [...this.presetMonths()];

            untracked(() => {
                this.form.reset({
                    months: entry ? [] : preset,
                    amount: entry ? amountToNumber(entry.amount) : null,
                });

                // Na edição o mês é fixo: o campo fica desligado e fora da validação.
                if (entry) {
                    this.form.controls.months.disable();
                } else {
                    this.form.controls.months.enable();
                }
            });
        });
    }

    protected save(): void {
        if (this.form.invalid) {
            revealFormErrors(this.form);
            return;
        }

        const amount = numberToAmount(this.form.controls.amount.value ?? 0);
        const current = this.entry();
        const months = [...this.form.controls.months.value].sort((a, b) => a - b);
        const kind = this.kind();
        const noun = this.noun();
        const service = kind === 'income' ? this.incomes : this.reserves;

        const request: Observable<unknown> = current
            ? service.update(current.month, { amount })
            : service.create({ year: this.year(), months, amount });

        this.saving.set(true);

        request.subscribe({
            next: () => {
                this.saving.set(false);
                this.notifications.success(
                    current
                        ? `${capitalize(noun)} atualizada.`
                        : `${capitalize(noun)} cadastrada em ${months.length} ${months.length === 1 ? 'mês' : 'meses'}.`,
                );
                this.saved.emit();
                this.visible.set(false);
            },
            error: (error: unknown) => {
                this.saving.set(false);

                const apiError = ApiError.from(error);

                if (apiError.code === KINDS[kind].conflictCode) {
                    setServerError(this.form.controls.months, apiError.message);
                } else if (apiError.code === KINDS[kind].invalidAmountCode) {
                    setServerError(this.form.controls.amount, apiError.message);
                } else if (!applyServerErrors(this.form, apiError)) {
                    this.notifications.error(apiError);
                }
            },
        });
    }

    protected async remove(): Promise<void> {
        const current = this.entry();

        if (!current) {
            return;
        }

        const noun = this.noun();
        const confirmed = await this.confirm.danger({
            header: `Excluir ${noun}`,
            message: `Excluir a ${noun} de ${formatMonth(current.month)}? Essa ação não pode ser desfeita.`,
            acceptLabel: 'Excluir',
        });

        if (!confirmed) {
            return;
        }

        const service = this.kind() === 'income' ? this.incomes : this.reserves;

        service.delete(current.month).subscribe({
            next: () => {
                this.notifications.success(`${capitalize(noun)} excluída.`);
                this.saved.emit();
                this.visible.set(false);
            },
            error: (error: unknown) => this.notifications.error(error),
        });
    }
}

function capitalize(text: string): string {
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}
