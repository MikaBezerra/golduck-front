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
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';

import { ApiError } from '../../../core/api/api-error';
import { NotificationService } from '../../../core/notification/notification.service';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { applyServerErrors, revealFormErrors, setServerError } from '../../../shared/forms/form-errors';
import { ExpenseLookupsService } from '../../manual-expenses/data-access/expense-lookups.service';
import {
    type CardExpense,
    type CardExpenseChanges,
    CARD_EXPENSE_NICKNAME_MAX_LENGTH,
} from '../data-access/card-expense.models';
import { CardExpenseService } from '../data-access/card-expense.service';

/** No modo "várias despesas", `null` no seletor de pessoa significa "manter"; este valor remove a pessoa. */
const NO_PERSON = '__no_person__';

interface SelectOption {
    readonly label: string;
    readonly value: string;
}

/**
 * Edita apelido, categoria e pessoa de uma despesa do cartão ou de várias de uma vez.
 * Valor, data e descrição vêm da fatura e não mudam aqui.
 */
@Component({
    selector: 'app-card-expense-edit-dialog',
    imports: [ReactiveFormsModule, Button, Dialog, InputText, Message, Select, FieldErrorComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './card-expense-edit-dialog.component.html',
})
export class CardExpenseEditDialogComponent {
    public readonly visible = model(false);
    public readonly expenses = input.required<readonly CardExpense[]>();
    public readonly saved = output();

    private readonly cardExpenses = inject(CardExpenseService);
    private readonly notifications = inject(NotificationService);
    private readonly lookups = inject(ExpenseLookupsService);

    protected readonly nicknameMaxLength = CARD_EXPENSE_NICKNAME_MAX_LENGTH;
    protected readonly saving = signal(false);
    protected readonly nothingToChange = signal(false);

    /** A despesa sendo editada, quando é só uma. */
    protected readonly single = computed(() => {
        const expenses = this.expenses();

        return expenses.length === 1 ? expenses[0] : null;
    });
    protected readonly hasInstallments = computed(() => this.expenses().some((expense) => expense.installment));

    protected readonly categoryOptions = computed<SelectOption[]>(() => {
        const options = this.lookups
            .activeCategories()
            .map((category) => ({ label: category.name, value: category.id }));
        const current = this.single()?.categoryId;

        if (current && !options.some((option) => option.value === current)) {
            const name = this.lookups.categoryById().get(current)?.name ?? 'Categoria';

            return [...options, { label: `${name} (desativada)`, value: current }];
        }

        return options;
    });

    protected readonly personOptions = computed<SelectOption[]>(() => {
        const options = this.lookups.activePeople().map((person) => ({ label: person.name, value: person.id }));
        const single = this.single();

        if (!single) {
            return [{ label: 'Ninguém (remover pessoa)', value: NO_PERSON }, ...options];
        }

        if (single.personId && !options.some((option) => option.value === single.personId)) {
            const name = this.lookups.personById().get(single.personId)?.name ?? 'Pessoa';

            return [...options, { label: `${name} (desativada)`, value: single.personId }];
        }

        return options;
    });

    protected readonly form = new FormGroup({
        nickname: new FormControl('', {
            nonNullable: true,
            validators: [Validators.maxLength(CARD_EXPENSE_NICKNAME_MAX_LENGTH)],
        }),
        categoryId: new FormControl<string | null>(null),
        personId: new FormControl<string | null>(null),
    });

    public constructor() {
        effect(() => {
            if (!this.visible()) {
                return;
            }

            untracked(() => {
                const single = this.single();

                this.nothingToChange.set(false);
                this.form.reset({
                    nickname: single?.nickname ?? '',
                    categoryId: single?.categoryId ?? null,
                    personId: single?.personId ?? null,
                });
            });
        });
    }

    protected save(): void {
        if (this.form.invalid) {
            revealFormErrors(this.form);
            return;
        }

        const single = this.single();
        const changes = single ? this.changesForOne(single) : this.changesForMany();

        if (Object.keys(changes).length === 0) {
            if (single) {
                this.notifications.info('Nada foi alterado.');
                this.visible.set(false);
            } else {
                this.nothingToChange.set(true);
            }

            return;
        }

        const ids = this.expenses().map((expense) => expense.id);

        this.saving.set(true);

        this.cardExpenses.updateMany({ ids, changes }).subscribe({
            next: (updated) => {
                this.saving.set(false);
                this.notifications.success(
                    updated.length > ids.length
                        ? `${updated.length} despesas atualizadas (inclui as próximas parcelas).`
                        : ids.length === 1
                          ? 'Despesa atualizada.'
                          : `${ids.length} despesas atualizadas.`,
                );
                this.saved.emit();
                this.visible.set(false);
            },
            error: (error: unknown) => {
                this.saving.set(false);

                const apiError = ApiError.from(error);

                if (apiError.code === 'CARD_EXPENSE_INACTIVE_CATEGORY') {
                    setServerError(this.form.controls.categoryId, apiError.message);
                } else if (apiError.code === 'CARD_EXPENSE_INACTIVE_PERSON') {
                    setServerError(this.form.controls.personId, apiError.message);
                } else if (
                    !applyServerErrors(this.form, apiError, {
                        'changes.nickname': 'nickname',
                        'changes.categoryId': 'categoryId',
                        'changes.personId': 'personId',
                    })
                ) {
                    this.notifications.error(apiError);
                }
            },
        });
    }

    /** Uma despesa: envia só o que mudou (reenviar uma categoria desativada daria erro). */
    private changesForOne(current: CardExpense): CardExpenseChanges {
        const { nickname, categoryId, personId } = this.form.getRawValue();
        const changes: CardExpenseChanges = {};
        const newNickname = nickname.trim() || null;

        if (newNickname !== current.nickname) {
            changes.nickname = newNickname;
        }

        if (categoryId && categoryId !== current.categoryId) {
            changes.categoryId = categoryId;
        }

        if ((personId ?? null) !== current.personId) {
            changes.personId = personId ?? null;
        }

        return changes;
    }

    /** Várias despesas: campo vazio = manter como está. */
    private changesForMany(): CardExpenseChanges {
        const { nickname, categoryId, personId } = this.form.getRawValue();
        const changes: CardExpenseChanges = {};

        if (nickname.trim()) {
            changes.nickname = nickname.trim();
        }

        if (categoryId) {
            changes.categoryId = categoryId;
        }

        if (personId) {
            changes.personId = personId === NO_PERSON ? null : personId;
        }

        return changes;
    }
}
