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
import { NotificationService } from '../../../core/notification/notification.service';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { applyServerErrors, revealFormErrors, setServerError } from '../../../shared/forms/form-errors';
import { amountToNumber, numberToAmount } from '../../../shared/money/money';
import { MONEY_ERROR_MESSAGES, MONEY_MAX, moneyValidators } from '../../../shared/money/money-input';
import { MONTH_NAMES } from '../../../shared/month/month';
import { MonthPipe } from '../../../shared/month/month.pipe';
import type { Income } from '../data-access/income.models';
import { IncomeService } from '../data-access/income.service';

interface MonthOption {
    readonly label: string;
    readonly value: number;
    readonly disabled: boolean;
}

/**
 * Cadastra a mesma entrada em vários meses do ano, ou edita o valor de um mês.
 */
@Component({
    selector: 'app-income-form-dialog',
    imports: [ReactiveFormsModule, Button, Dialog, InputNumber, MultiSelect, FieldErrorComponent, MonthPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './income-form-dialog.component.html',
})
export class IncomeFormDialogComponent {
    public readonly visible = model(false);
    public readonly year = input.required<number>();
    /** Entrada a editar; `null` para cadastrar. */
    public readonly income = input<Income | null>(null);
    /** Meses (1–12) que já têm entrada no ano: aparecem bloqueados. */
    public readonly takenMonths = input<readonly number[]>([]);
    /** Meses já marcados ao abrir (ex.: clicou em "Adicionar" numa linha). */
    public readonly presetMonths = input<readonly number[]>([]);
    public readonly saved = output();

    private readonly incomes = inject(IncomeService);
    private readonly notifications = inject(NotificationService);

    protected readonly moneyMax = MONEY_MAX;
    protected readonly moneyMessages = MONEY_ERROR_MESSAGES;
    protected readonly saving = signal(false);
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

            const income = this.income();
            const preset = [...this.presetMonths()];

            untracked(() => {
                this.form.reset({
                    months: income ? [] : preset,
                    amount: income ? amountToNumber(income.amount) : null,
                });

                // Na edição o mês é fixo: o campo fica desligado e fora da validação.
                if (income) {
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
        const current = this.income();
        const months = [...this.form.controls.months.value].sort((a, b) => a - b);

        const request: Observable<unknown> = current
            ? this.incomes.update(current.month, { amount })
            : this.incomes.create({ year: this.year(), months, amount });

        this.saving.set(true);

        request.subscribe({
            next: () => {
                this.saving.set(false);
                this.notifications.success(
                    current
                        ? 'Entrada atualizada.'
                        : `Entrada cadastrada em ${months.length} ${months.length === 1 ? 'mês' : 'meses'}.`,
                );
                this.saved.emit();
                this.visible.set(false);
            },
            error: (error: unknown) => {
                this.saving.set(false);

                const apiError = ApiError.from(error);

                if (apiError.code === 'INCOME_MONTH_CONFLICT') {
                    setServerError(this.form.controls.months, apiError.message);
                } else if (apiError.code === 'INCOME_INVALID_AMOUNT') {
                    setServerError(this.form.controls.amount, apiError.message);
                } else if (!applyServerErrors(this.form, apiError)) {
                    this.notifications.error(apiError);
                }
            },
        });
    }
}
