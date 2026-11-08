import {
    ChangeDetectionStrategy,
    Component,
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
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    type ValidationErrors,
    Validators,
} from '@angular/forms';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import type { Observable } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { applyServerErrors, revealFormErrors } from '../../../shared/forms/form-errors';
import { amountToNumber, numberToAmount } from '../../../shared/money/money';
import { MONEY_MAX, MONEY_MIN } from '../../../shared/money/money-input';
import { dateToMonthKey, monthKeyToDate } from '../../../shared/month/month';
import {
    BILLING_DAY_MAX,
    BILLING_DAY_MIN,
    CARD_BANK_LABELS,
    CARD_BANK_OPTIONS,
    type CardBank,
    type CreateCreditCardRequest,
    type CreditCard,
    CREDIT_CARD_NAME_MAX_LENGTH,
    type UpdateCreditCardRequest,
} from '../data-access/credit-card.models';
import { CreditCardService } from '../data-access/credit-card.service';
import { CreditCardSyncStatusComponent } from './credit-card-sync-status.component';

/** Id de item do Meu Pluggy: UUID v4 (a mesma regra do back). Espaços em volta, comuns ao colar, são aceitos e removidos. */
const PLUGGY_ITEM_ID_PATTERN = /^\s*[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\s*$/i;

/** Com o item do Meu Pluggy preenchido, a sincronização precisa também do ciclo da fatura e da primeira fatura. */
function syncSettingsValidator(group: AbstractControl): ValidationErrors | null {
    const filled = (name: string): boolean => {
        const value: unknown = group.get(name)?.value;

        return typeof value === 'string' ? value.trim() !== '' : value !== null && value !== undefined;
    };

    if (!filled('pluggyItemId')) {
        return null;
    }

    return !filled('dueDay') || !filled('bestPurchaseDay') || !filled('syncFromMonth')
        ? { syncSettings: 'Para sincronizar, preencha também o vencimento, o melhor dia e a primeira fatura.' }
        : null;
}

interface FormValue {
    readonly name: string;
    readonly dueDay: number | null;
    readonly bestPurchaseDay: number | null;
    readonly pluggyItemId: string | null;
    readonly syncFromMonth: string | null;
    /** Limite em reais (`"8000.00"`); `null` sem limite. */
    readonly creditLimit: string | null;
}

/** Mensagens do campo de limite (opcional). */
const LIMIT_ERROR_MESSAGES: Readonly<Record<string, string>> = {
    min: 'O limite precisa ser maior que zero',
    max: 'Valor alto demais',
};

/**
 * Diálogo para cadastrar ou editar um cartão: nome, banco (só na criação), ciclo da fatura e a
 * ligação com o Meu Pluggy. Na edição mostra também a situação da sincronização.
 */
@Component({
    selector: 'app-credit-card-form-dialog',
    imports: [
        ReactiveFormsModule,
        Button,
        DatePicker,
        Dialog,
        InputNumber,
        InputText,
        Select,
        FieldErrorComponent,
        CreditCardSyncStatusComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './credit-card-form-dialog.component.html',
})
export class CreditCardFormDialogComponent {
    public readonly visible = model(false);
    /** Cartão a editar; `null` para cadastrar um novo. */
    public readonly card = input<CreditCard | null>(null);
    public readonly saved = output<CreditCard>();

    private readonly creditCards = inject(CreditCardService);
    private readonly notifications = inject(NotificationService);

    protected readonly nameMaxLength = CREDIT_CARD_NAME_MAX_LENGTH;
    protected readonly dayMin = BILLING_DAY_MIN;
    protected readonly dayMax = BILLING_DAY_MAX;
    protected readonly bankOptions = CARD_BANK_OPTIONS;
    protected readonly bankLabels = CARD_BANK_LABELS;
    protected readonly moneyMax = MONEY_MAX;
    protected readonly limitMessages = LIMIT_ERROR_MESSAGES;
    protected readonly saving = signal(false);
    protected readonly form = new FormGroup(
        {
            name: new FormControl('', {
                nonNullable: true,
                validators: [Validators.required, Validators.maxLength(CREDIT_CARD_NAME_MAX_LENGTH)],
            }),
            bank: new FormControl<CardBank | null>(null, Validators.required),
            dueDay: new FormControl<number | null>(null, [
                Validators.min(BILLING_DAY_MIN),
                Validators.max(BILLING_DAY_MAX),
            ]),
            bestPurchaseDay: new FormControl<number | null>(null, [
                Validators.min(BILLING_DAY_MIN),
                Validators.max(BILLING_DAY_MAX),
            ]),
            pluggyItemId: new FormControl('', {
                nonNullable: true,
                validators: [Validators.pattern(PLUGGY_ITEM_ID_PATTERN)],
            }),
            syncFromMonth: new FormControl<Date | null>(null),
            creditLimit: new FormControl<number | null>(null, [Validators.min(MONEY_MIN), Validators.max(MONEY_MAX)]),
        },
        { validators: [syncSettingsValidator] },
    );

    public constructor() {
        effect(() => {
            if (!this.visible()) {
                return;
            }

            const card = this.card();

            untracked(() => {
                this.form.reset({
                    name: card?.name ?? '',
                    bank: card?.bank ?? null,
                    dueDay: card?.dueDay ?? null,
                    bestPurchaseDay: card?.bestPurchaseDay ?? null,
                    pluggyItemId: card?.pluggyItemId ?? '',
                    syncFromMonth: card?.syncFromMonth ? monthKeyToDate(card.syncFromMonth) : null,
                    creditLimit: card?.creditLimit ? amountToNumber(card.creditLimit) : null,
                });

                // O back não aceita apagar o vencimento nem o melhor dia: depois de informados, ficam obrigatórios.
                setRequired(this.form.controls.dueDay, (card?.dueDay ?? null) !== null);
                setRequired(this.form.controls.bestPurchaseDay, (card?.bestPurchaseDay ?? null) !== null);

                // Na edição o banco é fixo: o campo fica desligado e fora da validação.
                if (card) {
                    this.form.controls.bank.disable();
                } else {
                    this.form.controls.bank.enable();
                }
            });
        });
    }

    protected save(): void {
        if (!this.form.controls.name.value.trim()) {
            this.form.controls.name.setValue('');
        }

        if (this.form.invalid) {
            revealFormErrors(this.form);
            return;
        }

        const value = this.readForm();
        const current = this.card();
        let request: Observable<CreditCard>;

        if (current) {
            const changes = updateChanges(current, value);

            if (Object.keys(changes).length === 0) {
                this.notifications.info('Nada foi alterado.');
                this.visible.set(false);
                return;
            }

            request = this.creditCards.update(current.id, changes);
        } else {
            request = this.creditCards.create(createRequest(value, this.form.controls.bank.value ?? 'NUBANK'));
        }

        this.saving.set(true);

        request.subscribe({
            next: (card) => {
                this.saving.set(false);
                this.notifications.success(current ? 'Cartão atualizado.' : 'Cartão cadastrado.');
                this.saved.emit(card);
                this.visible.set(false);
            },
            error: (error: unknown) => {
                this.saving.set(false);

                if (!applyServerErrors(this.form, error)) {
                    this.notifications.error(error);
                }
            },
        });
    }

    private readForm(): FormValue {
        const raw = this.form.getRawValue();

        return {
            name: raw.name.trim(),
            dueDay: raw.dueDay,
            bestPurchaseDay: raw.bestPurchaseDay,
            pluggyItemId: raw.pluggyItemId.trim().toLowerCase() || null,
            syncFromMonth: raw.syncFromMonth ? dateToMonthKey(raw.syncFromMonth) : null,
            creditLimit: raw.creditLimit === null ? null : numberToAmount(raw.creditLimit),
        };
    }
}

function setRequired(control: AbstractControl, required: boolean): void {
    if (required) {
        control.addValidators(Validators.required);
    } else {
        control.removeValidators(Validators.required);
    }

    control.updateValueAndValidity({ emitEvent: false });
}

/** Na criação, os campos opcionais vazios ficam de fora. */
function createRequest(value: FormValue, bank: CardBank): CreateCreditCardRequest {
    return {
        name: value.name,
        bank,
        ...(value.dueDay !== null ? { dueDay: value.dueDay } : {}),
        ...(value.bestPurchaseDay !== null ? { bestPurchaseDay: value.bestPurchaseDay } : {}),
        ...(value.pluggyItemId ? { pluggyItemId: value.pluggyItemId } : {}),
        ...(value.syncFromMonth ? { syncFromMonth: value.syncFromMonth } : {}),
        ...(value.creditLimit ? { creditLimit: value.creditLimit } : {}),
    };
}

/** Na edição, só o que mudou. Item ou primeira fatura apagados vão como `null` (desligam a sincronização). */
function updateChanges(current: CreditCard, value: FormValue): UpdateCreditCardRequest {
    const changes: UpdateCreditCardRequest = {};

    if (value.name !== current.name) {
        changes.name = value.name;
    }

    if (value.dueDay !== null && value.dueDay !== current.dueDay) {
        changes.dueDay = value.dueDay;
    }

    if (value.bestPurchaseDay !== null && value.bestPurchaseDay !== current.bestPurchaseDay) {
        changes.bestPurchaseDay = value.bestPurchaseDay;
    }

    if (value.pluggyItemId !== current.pluggyItemId) {
        changes.pluggyItemId = value.pluggyItemId;
    }

    if (value.syncFromMonth !== current.syncFromMonth) {
        changes.syncFromMonth = value.syncFromMonth;
    }

    // Compara em centavos ("8000" e "8000.00" são o mesmo limite); apagado vai como `null`.
    const currentLimit = current.creditLimit === null ? null : amountToNumber(current.creditLimit);
    const newLimit = value.creditLimit === null ? null : amountToNumber(value.creditLimit);

    if (newLimit !== currentLimit) {
        changes.creditLimit = value.creditLimit;
    }

    return changes;
}
