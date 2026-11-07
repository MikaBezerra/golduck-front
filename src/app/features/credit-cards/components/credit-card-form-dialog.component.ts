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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import type { Observable } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { applyServerErrors, revealFormErrors } from '../../../shared/forms/form-errors';
import {
    CARD_BANK_LABELS,
    CARD_BANK_OPTIONS,
    type CardBank,
    type CreditCard,
    CREDIT_CARD_NAME_MAX_LENGTH,
} from '../data-access/credit-card.models';
import { CreditCardService } from '../data-access/credit-card.service';

/** Diálogo para cadastrar um cartão ou renomear um existente (o banco não muda depois de criado). */
@Component({
    selector: 'app-credit-card-form-dialog',
    imports: [ReactiveFormsModule, Button, Dialog, InputText, Select, FieldErrorComponent],
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
    protected readonly bankOptions = CARD_BANK_OPTIONS;
    protected readonly bankLabels = CARD_BANK_LABELS;
    protected readonly saving = signal(false);
    protected readonly form = new FormGroup({
        name: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.maxLength(CREDIT_CARD_NAME_MAX_LENGTH)],
        }),
        bank: new FormControl<CardBank | null>(null, Validators.required),
    });

    public constructor() {
        effect(() => {
            if (!this.visible()) {
                return;
            }

            const card = this.card();

            untracked(() => {
                this.form.reset({ name: card?.name ?? '', bank: card?.bank ?? null });

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

        const name = this.form.controls.name.value.trim();
        const bank = this.form.controls.bank.value;
        const current = this.card();

        const request: Observable<CreditCard> = current
            ? this.creditCards.update(current.id, { name })
            : this.creditCards.create({ name, bank: bank ?? 'NUBANK' });

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
}
