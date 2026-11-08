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
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import type { Observable } from 'rxjs';

import { ApiError } from '../../../core/api/api-error';
import { NotificationService } from '../../../core/notification/notification.service';
import { choiceOf, personChoiceOptions, splitOfChoice } from '../../../shared/expense-split/expense-split';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { applyServerErrors, revealFormErrors, setServerError } from '../../../shared/forms/form-errors';
import { amountToNumber, numberToAmount } from '../../../shared/money/money';
import { MONEY_ERROR_MESSAGES, MONEY_MAX, moneyValidators } from '../../../shared/money/money-input';
import { dateToMonthKey, formatMonth, monthKeyToDate } from '../../../shared/month/month';
import { MonthPipe } from '../../../shared/month/month.pipe';
import { ExpenseLookupsService } from '../data-access/expense-lookups.service';
import {
    EXPENSE_TITLE_MAX_LENGTH,
    type ManualExpense,
    type ManualExpenseChanges,
} from '../data-access/manual-expense.models';
import { ManualExpenseService } from '../data-access/manual-expense.service';

interface SelectOption {
    readonly label: string;
    readonly value: string;
}

/** Erros do back que pertencem a um campo específico do formulário. */
const FIELD_BY_ERROR_CODE: Readonly<Record<string, string>> = {
    MANUAL_EXPENSE_INVALID_AMOUNT: 'amount',
    MANUAL_EXPENSE_INACTIVE_PERSON: 'personId',
    PERSON_NOT_FOUND: 'personId',
};

/** Nomes dos campos na API → nomes no formulário. */
const FIELD_MAP: Readonly<Record<string, string>> = {
    'changes.title': 'title',
    'changes.amount': 'amount',
    'changes.personId': 'personId',
    'changes.split': 'personId',
    split: 'personId',
    replicateUntilYearEnd: 'replicate',
};

/** Lança uma despesa nova ou edita uma existente. Despesa não tem categoria (só as compras do cartão). */
@Component({
    selector: 'app-expense-form-dialog',
    imports: [
        ReactiveFormsModule,
        Button,
        Checkbox,
        DatePicker,
        Dialog,
        InputNumber,
        InputText,
        Select,
        FieldErrorComponent,
        MonthPipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './expense-form-dialog.component.html',
})
export class ExpenseFormDialogComponent {
    public readonly visible = model(false);
    /** Despesa a editar; `null` para lançar uma nova. */
    public readonly expense = input<ManualExpense | null>(null);
    /** Mês sugerido para uma despesa nova (`"AAAA-MM"`). */
    public readonly defaultMonth = input.required<string>();
    public readonly saved = output();

    private readonly expenses = inject(ManualExpenseService);
    private readonly notifications = inject(NotificationService);
    protected readonly lookups = inject(ExpenseLookupsService);

    protected readonly titleMaxLength = EXPENSE_TITLE_MAX_LENGTH;
    protected readonly moneyMax = MONEY_MAX;
    protected readonly moneyMessages = MONEY_ERROR_MESSAGES;
    protected readonly saving = signal(false);

    protected readonly form = new FormGroup({
        month: new FormControl<Date | null>(null, Validators.required),
        title: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.maxLength(EXPENSE_TITLE_MAX_LENGTH)],
        }),
        amount: new FormControl<number | null>(null, moneyValidators),
        /** A escolha do select: id da pessoa ou "Compartilhada" (`SHARED_CHOICE`). Obrigatória. */
        personId: new FormControl<string | null>(null, Validators.required),
        replicate: new FormControl(false, { nonNullable: true }),
    });

    private readonly monthValue = toSignal(this.form.controls.month.valueChanges, { initialValue: null });

    /** Quantas despesas serão criadas ao repetir até dezembro (contando o mês escolhido). */
    protected readonly replicateCount = computed(() => {
        const month = this.monthValue();

        return month ? 12 - month.getMonth() : 0;
    });
    protected readonly replicateUntil = computed(() => {
        const month = this.monthValue();

        return month ? formatMonth(`${month.getFullYear()}-12`) : '';
    });

    protected readonly personOptions = computed<SelectOption[]>(() => {
        const options = this.lookups.activePeople().map((person) => ({ label: person.name, value: person.id }));

        return personChoiceOptions(
            this.withCurrentInactive(
                options,
                this.expense()?.personId ?? null,
                (id) => this.lookups.personById().get(id)?.name,
            ),
        );
    });

    public constructor() {
        effect(() => {
            if (!this.visible()) {
                return;
            }

            const expense = this.expense();
            const defaultMonth = this.defaultMonth();

            untracked(() => {
                this.form.reset({
                    month: monthKeyToDate(expense?.month ?? defaultMonth),
                    title: expense?.title ?? '',
                    amount: expense ? amountToNumber(expense.amount) : null,
                    personId: expense ? choiceOf(expense) : null,
                    replicate: false,
                });

                // O back não muda o mês de uma despesa já lançada.
                if (expense) {
                    this.form.controls.month.disable();
                } else {
                    this.form.controls.month.enable();
                }
            });
        });
    }

    protected save(): void {
        if (!this.form.controls.title.value.trim()) {
            this.form.controls.title.setValue('');
        }

        if (this.form.invalid) {
            revealFormErrors(this.form);
            return;
        }

        const current = this.expense();

        if (current) {
            this.update(current);
        } else {
            this.create();
        }
    }

    private create(): void {
        const { month, title, amount, personId, replicate } = this.form.getRawValue();
        const monthKey = dateToMonthKey(month ?? new Date());

        this.submit(
            this.expenses.create({
                month: monthKey,
                title: title.trim(),
                amount: numberToAmount(amount ?? 0),
                ...splitOfChoice(personId ?? ''),
                ...(replicate ? { replicateUntilYearEnd: true } : {}),
            }),
            (created) => {
                const count = Array.isArray(created) ? created.length : 1;

                return count > 1 ? `Despesa lançada em ${count} meses.` : 'Despesa lançada.';
            },
        );
    }

    /** Envia só o que mudou: reenviar uma pessoa que foi desativada daria erro no back. */
    private update(current: ManualExpense): void {
        const { title, amount, personId } = this.form.getRawValue();
        const changes: ManualExpenseChanges = {};
        const newAmount = numberToAmount(amount ?? 0);

        if (title.trim() !== current.title) {
            changes.title = title.trim();
        }

        if (amountToNumber(newAmount) !== amountToNumber(current.amount)) {
            changes.amount = newAmount;
        }

        if (personId && personId !== choiceOf(current)) {
            Object.assign(changes, splitOfChoice(personId));
        }

        if (Object.keys(changes).length === 0) {
            this.notifications.info('Nada foi alterado.');
            this.visible.set(false);
            return;
        }

        this.submit(this.expenses.updateMany({ ids: [current.id], changes }), () => 'Despesa atualizada.');
    }

    private submit(request: Observable<unknown>, successMessage: (result: unknown) => string): void {
        this.saving.set(true);

        request.subscribe({
            next: (result) => {
                this.saving.set(false);
                this.notifications.success(successMessage(result));
                this.saved.emit();
                this.visible.set(false);
            },
            error: (error: unknown) => {
                this.saving.set(false);

                const apiError = ApiError.from(error);
                const field = FIELD_BY_ERROR_CODE[apiError.code];

                if (field) {
                    setServerError(this.form.get(field), apiError.message);
                } else if (!applyServerErrors(this.form, apiError, FIELD_MAP)) {
                    this.notifications.error(apiError);
                }
            },
        });
    }

    /** Na edição, mantém visível a pessoa atual mesmo que tenha sido desativada. */
    private withCurrentInactive(
        options: SelectOption[],
        currentId: string | null,
        nameOf: (id: string) => string | undefined,
    ): SelectOption[] {
        if (!currentId || options.some((option) => option.value === currentId)) {
            return options;
        }

        return [...options, { label: `${nameOf(currentId) ?? 'Carregando…'} (desativada)`, value: currentId }];
    }
}
