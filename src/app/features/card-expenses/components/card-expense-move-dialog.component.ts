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
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { Message } from 'primeng/message';

import { ApiError } from '../../../core/api/api-error';
import { NotificationService } from '../../../core/notification/notification.service';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { applyServerErrors, revealFormErrors, setServerError } from '../../../shared/forms/form-errors';
import { dateToMonthKey, formatMonth, monthKeyToDate } from '../../../shared/month/month';
import {
    canMoveCardExpense,
    type CardExpense,
    MAX_INSTALLMENTS,
    type MoveCardExpenseRequest,
} from '../data-access/card-expense.models';
import { CardExpenseService } from '../data-access/card-expense.service';
import { installmentPairValidator } from './installment.validator';

/**
 * "Mudar de fatura" (`POST /card-expenses/{id}/move`): a linha passa a ser a parcela informada na
 * fatura informada e as outras parcelas da compra seguem a partir dela. Em compras sincronizadas a
 * correção vale também para as próximas sincronizações. Compras de upload não mudam.
 */
@Component({
    selector: 'app-card-expense-move-dialog',
    imports: [ReactiveFormsModule, Button, DatePicker, Dialog, InputNumber, Message, FieldErrorComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './card-expense-move-dialog.component.html',
})
export class CardExpenseMoveDialogComponent {
    public readonly visible = model(false);
    public readonly expense = input<CardExpense | null>(null);
    /** Mês para onde a linha foi, para a página poder ir até ele. */
    public readonly moved = output<string>();

    private readonly cardExpenses = inject(CardExpenseService);
    private readonly notifications = inject(NotificationService);

    protected readonly maxInstallments = MAX_INSTALLMENTS;
    protected readonly saving = signal(false);
    protected readonly allowed = computed(() => {
        const expense = this.expense();

        return expense !== null && canMoveCardExpense(expense);
    });

    protected readonly form = new FormGroup(
        {
            month: new FormControl<Date | null>(null, Validators.required),
            installmentNumber: new FormControl<number | null>(null, [
                Validators.min(1),
                Validators.max(MAX_INSTALLMENTS),
            ]),
            installmentTotal: new FormControl<number | null>(null, [
                Validators.min(1),
                Validators.max(MAX_INSTALLMENTS),
            ]),
        },
        { validators: [installmentPairValidator] },
    );

    public constructor() {
        effect(() => {
            if (!this.visible()) {
                return;
            }

            const expense = this.expense();

            untracked(() => {
                this.form.reset({
                    month: expense ? monthKeyToDate(expense.month) : null,
                    installmentNumber: expense?.installment?.number ?? null,
                    installmentTotal: expense?.installment?.total ?? null,
                });

                if (this.allowed()) {
                    this.form.enable();
                } else {
                    this.form.disable();
                }
            });
        });
    }

    protected save(): void {
        const expense = this.expense();

        if (!expense || !this.allowed()) {
            return;
        }

        if (this.form.invalid) {
            revealFormErrors(this.form);
            return;
        }

        const body = this.toRequest(expense);

        if (
            body.month === expense.month &&
            body.installmentNumber === undefined &&
            body.installmentTotal === undefined
        ) {
            this.notifications.info('Nada foi alterado.');
            this.visible.set(false);
            return;
        }

        this.saving.set(true);

        this.cardExpenses.move(expense.id, body).subscribe({
            next: () => {
                this.saving.set(false);
                this.notifications.success(
                    `Compra movida: esta parcela agora está na fatura de ${formatMonth(body.month)}.`,
                );
                this.moved.emit(body.month);
                this.visible.set(false);
            },
            error: (error: unknown) => {
                this.saving.set(false);

                const apiError = ApiError.from(error);

                if (apiError.code === 'CARD_EXPENSE_INSTALLMENT_INVALID') {
                    setServerError(this.form.controls.installmentNumber, apiError.message);
                } else if (!applyServerErrors(this.form, apiError)) {
                    this.notifications.error(apiError);
                }
            },
        });
    }

    /** Parcela e total só vão quando mudaram (omitidos = os atuais). */
    private toRequest(expense: CardExpense): MoveCardExpenseRequest {
        const value = this.form.getRawValue();
        const body: MoveCardExpenseRequest = {
            month: value.month ? dateToMonthKey(value.month) : expense.month,
        };

        if (value.installmentNumber !== null && value.installmentNumber !== (expense.installment?.number ?? null)) {
            body.installmentNumber = value.installmentNumber;
        }

        if (value.installmentTotal !== null && value.installmentTotal !== (expense.installment?.total ?? null)) {
            body.installmentTotal = value.installmentTotal;
        }

        return body;
    }
}
