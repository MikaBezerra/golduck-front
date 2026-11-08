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
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';

import { ApiError } from '../../../core/api/api-error';
import { NotificationService } from '../../../core/notification/notification.service';
import { personChoiceOptions, splitOfChoice } from '../../../shared/expense-split/expense-split';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { applyServerErrors, revealFormErrors, setServerError } from '../../../shared/forms/form-errors';
import { numberToAmount } from '../../../shared/money/money';
import { MONEY_ERROR_MESSAGES, MONEY_MAX, MONEY_MIN } from '../../../shared/money/money-input';
import { ExpenseLookupsService } from '../data-access/expense-lookups.service';
import {
    EXPENSE_TITLE_MAX_LENGTH,
    type ManualExpense,
    type ManualExpenseChanges,
} from '../data-access/manual-expense.models';
import { ManualExpenseService } from '../data-access/manual-expense.service';

/** Valores especiais do seletor de pessoa (o `null` já significa "manter"). */

/**
 * Altera várias despesas de uma vez (`PATCH /manual-expenses`).
 * Campo vazio = manter como está em cada despesa.
 */
@Component({
    selector: 'app-expense-bulk-edit-dialog',
    imports: [ReactiveFormsModule, Button, Dialog, InputNumber, InputText, Message, Select, FieldErrorComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './expense-bulk-edit-dialog.component.html',
})
export class ExpenseBulkEditDialogComponent {
    public readonly visible = model(false);
    public readonly expenses = input.required<readonly ManualExpense[]>();
    public readonly saved = output();

    private readonly expenseService = inject(ManualExpenseService);
    private readonly notifications = inject(NotificationService);
    private readonly lookups = inject(ExpenseLookupsService);

    protected readonly titleMaxLength = EXPENSE_TITLE_MAX_LENGTH;
    protected readonly moneyMax = MONEY_MAX;
    protected readonly moneyMessages = MONEY_ERROR_MESSAGES;
    protected readonly saving = signal(false);
    protected readonly nothingToChange = signal(false);

    protected readonly personOptions = computed(() => [
        ...personChoiceOptions(this.lookups.activePeople().map((person) => ({ label: person.name, value: person.id }))),
    ]);

    protected readonly form = new FormGroup({
        title: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(EXPENSE_TITLE_MAX_LENGTH)] }),
        amount: new FormControl<number | null>(null, [Validators.min(MONEY_MIN), Validators.max(MONEY_MAX)]),
        personId: new FormControl<string | null>(null),
    });

    public constructor() {
        effect(() => {
            if (this.visible()) {
                untracked(() => {
                    this.form.reset();
                    this.nothingToChange.set(false);
                });
            }
        });
    }

    protected save(): void {
        if (this.form.invalid) {
            revealFormErrors(this.form);
            return;
        }

        const { title, amount, personId } = this.form.getRawValue();
        const changes: ManualExpenseChanges = {};

        if (title.trim()) {
            changes.title = title.trim();
        }

        if (amount !== null) {
            changes.amount = numberToAmount(amount);
        }

        if (personId) {
            Object.assign(changes, splitOfChoice(personId));
        }

        if (Object.keys(changes).length === 0) {
            this.nothingToChange.set(true);
            return;
        }

        const ids = this.expenses().map((expense) => expense.id);

        this.saving.set(true);
        this.nothingToChange.set(false);

        this.expenseService.updateMany({ ids, changes }).subscribe({
            next: (updated) => {
                this.saving.set(false);
                this.notifications.success(
                    updated.length === 1 ? '1 despesa atualizada.' : `${updated.length} despesas atualizadas.`,
                );
                this.saved.emit();
                this.visible.set(false);
            },
            error: (error: unknown) => {
                this.saving.set(false);

                const apiError = ApiError.from(error);

                if (apiError.code === 'MANUAL_EXPENSE_INACTIVE_PERSON') {
                    setServerError(this.form.controls.personId, apiError.message);
                } else if (
                    !applyServerErrors(this.form, apiError, {
                        'changes.title': 'title',
                        'changes.amount': 'amount',
                        'changes.personId': 'personId',
                        'changes.split': 'personId',
                    })
                ) {
                    this.notifications.error(apiError);
                }
            },
        });
    }
}
