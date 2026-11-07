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
import {
    type AbstractControl,
    FormArray,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    type ValidationErrors,
    Validators,
} from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';

import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { applyServerErrors, revealFormErrors } from '../../../shared/forms/form-errors';
import { amountToNumber, numberToAmount } from '../../../shared/money/money';
import { MONEY_ERROR_MESSAGES, MONEY_MAX, moneyValidators } from '../../../shared/money/money-input';
import { formatMonth } from '../../../shared/month/month';
import type { CardExpense } from '../../card-expenses/data-access/card-expense.models';
import type { CreditCard } from '../../credit-cards/data-access/credit-card.models';
import {
    type CardImportResult,
    describeImportSummary,
    MANUAL_DESCRIPTION_MAX_LENGTH,
    MAX_INSTALLMENTS,
    MAX_MANUAL_TRANSACTIONS,
    type ManualCardTransaction,
} from '../data-access/card-import.models';
import { CardImportService } from '../data-access/card-import.service';

type TransactionForm = FormGroup<{
    date: FormControl<string>;
    description: FormControl<string>;
    amount: FormControl<number | null>;
    installmentNumber: FormControl<number | null>;
    installmentTotal: FormControl<number | null>;
    cardLastDigits: FormControl<string>;
}>;

/** Parcela é opcional, mas, se informada, precisa de número e total, com número ≤ total. */
function installmentValidator(group: AbstractControl): ValidationErrors | null {
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

/**
 * Fatura digitada à mão, para quando não há arquivo do banco.
 * Como o envio de arquivo, substitui tudo o que o cartão tem no mês.
 */
@Component({
    selector: 'app-card-import-manual-dialog',
    imports: [ReactiveFormsModule, Button, Dialog, InputNumber, InputText, Message, FieldErrorComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './card-import-manual-dialog.component.html',
})
export class CardImportManualDialogComponent {
    public readonly visible = model(false);
    public readonly card = input.required<CreditCard>();
    /** Mês da fatura (`"AAAA-MM"`). */
    public readonly month = input.required<string>();
    /** Despesas que o cartão já tem no mês: a lista começa com elas. */
    public readonly existing = input<readonly CardExpense[]>([]);
    public readonly imported = output<CardImportResult>();

    private readonly cardImports = inject(CardImportService);
    private readonly notifications = inject(NotificationService);
    private readonly confirm = inject(ConfirmService);

    protected readonly descriptionMaxLength = MANUAL_DESCRIPTION_MAX_LENGTH;
    protected readonly maxInstallments = MAX_INSTALLMENTS;
    protected readonly maxTransactions = MAX_MANUAL_TRANSACTIONS;
    protected readonly moneyMax = MONEY_MAX;
    protected readonly moneyMessages = MONEY_ERROR_MESSAGES;
    protected readonly saving = signal(false);
    protected readonly result = signal<CardImportResult | null>(null);
    protected readonly monthLabel = computed(() => formatMonth(this.month()));
    protected readonly resultLines = computed(() => {
        const result = this.result();

        return result ? describeImportSummary(result.summary) : [];
    });

    protected readonly form = new FormGroup({ transactions: new FormArray<TransactionForm>([]) });
    protected readonly rows = this.form.controls.transactions;

    public constructor() {
        effect(() => {
            // Só a abertura do diálogo reinicia a lista (a página recarrega as despesas depois do envio).
            if (!this.visible()) {
                return;
            }

            untracked(() => {
                const existing = this.existing();

                this.result.set(null);
                this.rows.clear();
                existing.forEach((expense) => this.rows.push(this.createRow(expense)));

                if (this.rows.length === 0) {
                    this.addRow();
                }
            });
        });
    }

    protected addRow(): void {
        if (this.rows.length < MAX_MANUAL_TRANSACTIONS) {
            const lastDate = this.rows.length > 0 ? this.rows.at(this.rows.length - 1).controls.date.value : '';

            this.rows.push(this.createRow(null, lastDate || `${this.month()}-01`));
        }
    }

    protected removeRow(index: number): void {
        this.rows.removeAt(index);
    }

    protected async save(): Promise<void> {
        if (this.form.invalid) {
            revealFormErrors(this.form);
            return;
        }

        if (this.rows.length === 0) {
            const confirmed = await this.confirm.danger({
                header: 'Fatura sem lançamentos',
                message: `Todas as despesas de ${this.card().name} em ${this.monthLabel()} serão removidas. Continuar?`,
                acceptLabel: 'Remover tudo',
            });

            if (!confirmed) {
                return;
            }
        }

        this.saving.set(true);

        this.cardImports
            .createManual({
                cardId: this.card().id,
                month: this.month(),
                transactions: this.rows.controls.map((row) => this.toTransaction(row)),
            })
            .subscribe({
                next: (result) => {
                    this.saving.set(false);
                    this.result.set(result);
                    this.imported.emit(result);
                },
                error: (error: unknown) => {
                    this.saving.set(false);

                    if (!applyServerErrors(this.form, error)) {
                        this.notifications.error(error);
                    }
                },
            });
    }

    private createRow(expense: CardExpense | null, date = ''): TransactionForm {
        return new FormGroup(
            {
                date: new FormControl(expense?.transactionDate ?? date, {
                    nonNullable: true,
                    validators: [Validators.required],
                }),
                description: new FormControl(expense?.originalDescription ?? '', {
                    nonNullable: true,
                    validators: [Validators.required, Validators.maxLength(MANUAL_DESCRIPTION_MAX_LENGTH)],
                }),
                amount: new FormControl<number | null>(
                    expense ? amountToNumber(expense.amount) : null,
                    moneyValidators,
                ),
                installmentNumber: new FormControl<number | null>(expense?.installment?.number ?? null, [
                    Validators.min(1),
                    Validators.max(MAX_INSTALLMENTS),
                ]),
                installmentTotal: new FormControl<number | null>(expense?.installment?.total ?? null, [
                    Validators.min(1),
                    Validators.max(MAX_INSTALLMENTS),
                ]),
                cardLastDigits: new FormControl(expense?.cardLastDigits ?? '', {
                    nonNullable: true,
                    validators: [Validators.pattern(/^\d{4}$/)],
                }),
            },
            { validators: [installmentValidator] },
        );
    }

    private toTransaction(row: TransactionForm): ManualCardTransaction {
        const value = row.getRawValue();
        const hasInstallment = value.installmentNumber !== null && value.installmentTotal !== null;

        return {
            date: value.date,
            description: value.description.trim(),
            amount: numberToAmount(value.amount ?? 0),
            installment: hasInstallment
                ? { number: value.installmentNumber ?? 1, total: value.installmentTotal ?? 1 }
                : null,
            cardLastDigits: value.cardLastDigits || null,
        };
    }
}
