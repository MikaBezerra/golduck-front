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
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import type { Observable } from 'rxjs';

import { ApiError } from '../../../core/api/api-error';
import { NotificationService } from '../../../core/notification/notification.service';
import { IsoDatePipe } from '../../../shared/date/iso-date.pipe';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { revealFormErrors, setServerError } from '../../../shared/forms/form-errors';
import { formatMonth } from '../../../shared/month/month';
import { billDateRange, type CreditCard, type CreditCardBill } from '../data-access/credit-card.models';
import { CreditCardService } from '../data-access/credit-card.service';

/**
 * Ajusta o melhor dia de compra de uma fatura (`PUT /credit-cards/{id}/bills/{month}`), copiado do
 * app do banco, ou volta ao padrão do cartão. Depois que a fatura fecha, o fechamento informado pelo
 * banco vale sobre o ajuste. A página sincroniza o cartão depois de salvar.
 */
@Component({
    selector: 'app-credit-card-bill-dialog',
    imports: [ReactiveFormsModule, Button, Dialog, InputText, Message, IsoDatePipe, FieldErrorComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog
            [header]="'Melhor dia da fatura de ' + monthLabel()"
            [visible]="visible()"
            (visibleChange)="visible.set($event)"
            [modal]="true"
            [draggable]="false"
            [style]="{ width: '28rem' }"
            [breakpoints]="{ '640px': '95vw' }"
        >
            @if (bill(); as current) {
                <p class="mt-0 mb-4 text-muted-color">
                    {{ card().name }}: compras a partir do melhor dia vão para a fatura seguinte. Copie a data do app do
                    banco quando ela for diferente do padrão do cartão (dia {{ card().bestPurchaseDay }}).
                </p>

                @if (current.source === 'bank') {
                    <p-message severity="info" styleClass="mb-4">
                        O banco já informou o fechamento desta fatura ({{ current.closingDate | isoDate }}). Ele vale
                        sobre qualquer ajuste.
                    </p-message>
                }

                <form (ngSubmit)="save()" class="flex flex-col gap-4" novalidate>
                    <div class="flex flex-col gap-2">
                        <label for="bill-best-day" class="font-medium">Melhor dia de compra</label>
                        <input
                            pInputText
                            type="date"
                            id="bill-best-day"
                            [formControl]="date"
                            [min]="range().min"
                            [max]="range().max"
                            [fluid]="true"
                            aria-describedby="bill-best-day-help"
                        />
                        <small id="bill-best-day-help" class="text-muted-color">
                            Entre {{ range().min | isoDate }} e {{ range().max | isoDate }}.
                        </small>
                        <app-field-error [control]="date" />
                    </div>

                    <div class="flex flex-wrap justify-end gap-2">
                        @if (current.userBestPurchaseDate) {
                            <p-button
                                label="Voltar ao padrão"
                                severity="secondary"
                                [outlined]="true"
                                [loading]="saving() === 'reset'"
                                [disabled]="saving() !== null"
                                (onClick)="reset()"
                            />
                        }
                        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="visible.set(false)" />
                        <p-button
                            type="submit"
                            label="Salvar"
                            icon="pi pi-check"
                            [loading]="saving() === 'save'"
                            [disabled]="saving() !== null"
                        />
                    </div>
                </form>
            }
        </p-dialog>
    `,
})
export class CreditCardBillDialogComponent {
    public readonly visible = model(false);
    public readonly card = input.required<CreditCard>();
    public readonly bill = input<CreditCardBill | null>(null);
    /** Fatura com o ajuste aplicado: a página sincroniza o cartão em seguida. */
    public readonly saved = output<CreditCardBill>();

    private readonly creditCards = inject(CreditCardService);
    private readonly notifications = inject(NotificationService);

    protected readonly saving = signal<'save' | 'reset' | null>(null);
    protected readonly date = new FormControl('', { nonNullable: true, validators: [Validators.required] });
    protected readonly monthLabel = computed(() => {
        const bill = this.bill();

        return bill ? formatMonth(bill.month) : '';
    });
    protected readonly range = computed(() => {
        const bill = this.bill();

        return bill ? billDateRange(bill.month) : { min: '', max: '' };
    });

    public constructor() {
        effect(() => {
            if (!this.visible()) {
                return;
            }

            const bill = this.bill();

            untracked(() => this.date.reset(bill?.userBestPurchaseDate ?? bill?.bestPurchaseDate ?? ''));
        });
    }

    protected save(): void {
        const { min, max } = this.range();
        const value = this.date.value;

        if (value && (value < min || value > max)) {
            setServerError(this.date, `Escolha uma data entre ${formatIso(min)} e ${formatIso(max)}.`);
        }

        if (this.date.invalid) {
            revealFormErrors(this.date);
            return;
        }

        this.submit(value, 'save');
    }

    protected reset(): void {
        this.submit(null, 'reset');
    }

    private submit(bestPurchaseDate: string | null, mode: 'save' | 'reset'): void {
        const bill = this.bill();

        if (!bill) {
            return;
        }

        const request: Observable<CreditCardBill> = this.creditCards.updateBill(this.card().id, bill.month, {
            bestPurchaseDate,
        });

        this.saving.set(mode);

        request.subscribe({
            next: (updated) => {
                this.saving.set(null);
                this.notifications.success(
                    mode === 'reset'
                        ? `A fatura de ${formatMonth(updated.month)} voltou ao melhor dia padrão.`
                        : `Melhor dia da fatura de ${formatMonth(updated.month)} ajustado.`,
                );
                this.saved.emit(updated);
                this.visible.set(false);
            },
            error: (error: unknown) => {
                this.saving.set(null);

                const apiError = ApiError.from(error);

                if (apiError.code === 'CREDIT_CARD_BILL_DATE_OUT_OF_RANGE' || apiError.details.length > 0) {
                    setServerError(this.date, apiError.details[0]?.message ?? apiError.message);
                } else {
                    this.notifications.error(apiError);
                }
            },
        });
    }
}

/** `"2026-10-01"` → `"01/10/2026"` */
function formatIso(date: string): string {
    return new IsoDatePipe().transform(date);
}
