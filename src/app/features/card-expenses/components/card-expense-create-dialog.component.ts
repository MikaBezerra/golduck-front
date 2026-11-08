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
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { ApiError } from '../../../core/api/api-error';
import { NotificationService } from '../../../core/notification/notification.service';
import { personChoiceOptions, splitOfChoice } from '../../../shared/expense-split/expense-split';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { applyServerErrors, revealFormErrors, setServerError } from '../../../shared/forms/form-errors';
import { numberToAmount } from '../../../shared/money/money';
import { MONEY_ERROR_MESSAGES, MONEY_MAX, moneyValidators } from '../../../shared/money/money-input';
import { dateToMonthKey, formatMonth, monthKeyToDate } from '../../../shared/month/month';
import type { CreditCard } from '../../credit-cards/data-access/credit-card.models';
import { ExpenseLookupsService } from '../../manual-expenses/data-access/expense-lookups.service';
import {
    CARD_EXPENSE_DESCRIPTION_MAX_LENGTH,
    CARD_EXPENSE_NICKNAME_MAX_LENGTH,
    type CreateCardExpenseRequest,
    MAX_INSTALLMENTS,
} from '../data-access/card-expense.models';
import { CardExpenseService } from '../data-access/card-expense.service';
import { installmentPairValidator } from './installment.validator';

/**
 * "Adicionar compra": lança uma compra que está faltando na fatura (`POST /card-expenses`).
 * Parcelada, o back lança também as parcelas seguintes. Nem a sincronização nem o upload a apagam;
 * quando o banco trouxer a mesma compra, a do banco a substitui e herda apelido, categoria e pessoa.
 */
@Component({
    selector: 'app-card-expense-create-dialog',
    imports: [ReactiveFormsModule, Button, DatePicker, Dialog, InputNumber, InputText, Select, FieldErrorComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './card-expense-create-dialog.component.html',
})
export class CardExpenseCreateDialogComponent {
    public readonly visible = model(false);
    public readonly card = input.required<CreditCard>();
    /** Fatura sugerida (`"AAAA-MM"`): a que está na tela. */
    public readonly month = input.required<string>();
    /** Fatura em que a compra entrou (`"AAAA-MM"`), para a página poder ir até ela. */
    public readonly created = output<string>();

    private readonly cardExpenses = inject(CardExpenseService);
    private readonly notifications = inject(NotificationService);
    private readonly lookups = inject(ExpenseLookupsService);

    protected readonly descriptionMaxLength = CARD_EXPENSE_DESCRIPTION_MAX_LENGTH;
    protected readonly nicknameMaxLength = CARD_EXPENSE_NICKNAME_MAX_LENGTH;
    protected readonly maxInstallments = MAX_INSTALLMENTS;
    protected readonly moneyMax = MONEY_MAX;
    protected readonly moneyMessages = MONEY_ERROR_MESSAGES;
    protected readonly saving = signal(false);

    protected readonly categoryOptions = computed(() =>
        this.lookups.activeCategories().map((category) => ({ label: category.name, value: category.id })),
    );
    protected readonly personOptions = computed(() =>
        personChoiceOptions(this.lookups.activePeople().map((person) => ({ label: person.name, value: person.id }))),
    );
    protected readonly defaultCategoryName = computed(() => this.lookups.defaultCategory()?.name ?? 'Outros');

    protected readonly form = new FormGroup(
        {
            month: new FormControl<Date | null>(null, Validators.required),
            date: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
            description: new FormControl('', {
                nonNullable: true,
                validators: [Validators.required, Validators.maxLength(CARD_EXPENSE_DESCRIPTION_MAX_LENGTH)],
            }),
            amount: new FormControl<number | null>(null, moneyValidators),
            installmentNumber: new FormControl<number | null>(null, [
                Validators.min(1),
                Validators.max(MAX_INSTALLMENTS),
            ]),
            installmentTotal: new FormControl<number | null>(null, [
                Validators.min(1),
                Validators.max(MAX_INSTALLMENTS),
            ]),
            nickname: new FormControl('', {
                nonNullable: true,
                validators: [Validators.maxLength(CARD_EXPENSE_NICKNAME_MAX_LENGTH)],
            }),
            categoryId: new FormControl<string | null>(null),
            /** Id da pessoa ou "Compartilhada" (`SHARED_CHOICE`): obrigatório, a compra nasce classificada. */
            personId: new FormControl<string | null>(null, Validators.required),
        },
        { validators: [installmentPairValidator] },
    );

    public constructor() {
        effect(() => {
            if (!this.visible()) {
                return;
            }

            const month = this.month();

            untracked(() => this.form.reset({ month: monthKeyToDate(month), date: '' }));
        });
    }

    protected save(): void {
        if (!this.form.controls.description.value.trim()) {
            this.form.controls.description.setValue('');
        }

        if (this.form.invalid) {
            revealFormErrors(this.form);
            return;
        }

        const body = this.toRequest();

        this.saving.set(true);

        this.cardExpenses.create(body).subscribe({
            next: (rows) => {
                this.saving.set(false);
                this.notifications.success(
                    rows.length > 1
                        ? `Compra adicionada em ${formatMonth(body.month)}, com ${rows.length - 1} ${rows.length === 2 ? 'parcela seguinte' : 'parcelas seguintes'}.`
                        : `Compra adicionada em ${formatMonth(body.month)}.`,
                );
                this.created.emit(body.month);
                this.visible.set(false);
            },
            error: (error: unknown) => {
                this.saving.set(false);

                const apiError = ApiError.from(error);

                if (apiError.code === 'CARD_EXPENSE_INACTIVE_CATEGORY') {
                    setServerError(this.form.controls.categoryId, apiError.message);
                } else if (apiError.code === 'CARD_EXPENSE_INACTIVE_PERSON') {
                    setServerError(this.form.controls.personId, apiError.message);
                } else if (apiError.code === 'CARD_EXPENSE_INSTALLMENT_INVALID') {
                    setServerError(this.form.controls.installmentNumber, apiError.message);
                } else if (
                    !applyServerErrors(this.form, apiError, {
                        'installment.number': 'installmentNumber',
                        'installment.total': 'installmentTotal',
                        split: 'personId',
                        personId: 'personId',
                    })
                ) {
                    this.notifications.error(apiError);
                }
            },
        });
    }

    private toRequest(): CreateCardExpenseRequest {
        const value = this.form.getRawValue();
        const nickname = value.nickname.trim();

        return {
            cardId: this.card().id,
            month: dateToMonthKey(value.month ?? monthKeyToDate(this.month())),
            date: value.date,
            description: value.description.trim(),
            amount: numberToAmount(value.amount ?? 0),
            ...(value.installmentNumber !== null && value.installmentTotal !== null
                ? { installment: { number: value.installmentNumber, total: value.installmentTotal } }
                : {}),
            ...(nickname ? { nickname } : {}),
            ...(value.categoryId ? { categoryId: value.categoryId } : {}),
            ...splitOfChoice(value.personId ?? ''),
        };
    }
}
