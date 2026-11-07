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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { RadioButton } from 'primeng/radiobutton';
import type { Observable } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import {
    type CardExpense,
    type CardExpenseScope,
    CARD_EXPENSE_SCOPE_OPTIONS,
} from '../data-access/card-expense.models';
import { CardExpenseService } from '../data-access/card-expense.service';

/**
 * Exclui (exclusão suave) ou restaura despesas do cartão. Nas compras parceladas,
 * pergunta quais parcelas: só esta, esta e as próximas, esta e as anteriores, ou todas.
 */
@Component({
    selector: 'app-card-expense-exclusion-dialog',
    imports: [ReactiveFormsModule, Button, Dialog, RadioButton],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog
            [header]="title()"
            [visible]="visible()"
            (visibleChange)="visible.set($event)"
            [modal]="true"
            [draggable]="false"
            [style]="{ width: '30rem' }"
            [breakpoints]="{ '640px': '95vw' }"
        >
            <div class="flex flex-col gap-4">
                @if (mode() === 'exclude') {
                    <p class="m-0">
                        A despesa sai das listas e dos totais. Se a compra aparecer de novo numa fatura enviada depois,
                        ela continua excluída. Dá para restaurar em <strong>Mostrar excluídas</strong>.
                    </p>
                } @else {
                    <p class="m-0">A despesa volta para as listas e para os totais.</p>
                }

                @if (hasInstallments()) {
                    <fieldset class="m-0 flex flex-col gap-2 border-0 p-0">
                        <legend class="mb-2 font-medium">Nas compras parceladas, quais parcelas?</legend>
                        @for (option of scopeOptions; track option.value) {
                            <label class="flex cursor-pointer items-center gap-2" [for]="'scope-' + option.value">
                                <p-radiobutton
                                    [inputId]="'scope-' + option.value"
                                    name="exclusion-scope"
                                    [value]="option.value"
                                    [formControl]="scope"
                                />
                                {{ option.label }}
                            </label>
                        }
                    </fieldset>
                }

                <div class="flex justify-end gap-2">
                    <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="visible.set(false)" />
                    <p-button
                        [label]="mode() === 'exclude' ? 'Excluir' : 'Restaurar'"
                        [icon]="mode() === 'exclude' ? 'pi pi-trash' : 'pi pi-replay'"
                        [severity]="mode() === 'exclude' ? 'danger' : 'primary'"
                        [loading]="saving()"
                        (onClick)="confirm()"
                    />
                </div>
            </div>
        </p-dialog>
    `,
})
export class CardExpenseExclusionDialogComponent {
    public readonly visible = model(false);
    public readonly expenses = input.required<readonly CardExpense[]>();
    public readonly mode = input<'exclude' | 'restore'>('exclude');
    public readonly done = output();

    private readonly cardExpenses = inject(CardExpenseService);
    private readonly notifications = inject(NotificationService);

    protected readonly scopeOptions = CARD_EXPENSE_SCOPE_OPTIONS;
    protected readonly scope = new FormControl<CardExpenseScope>('all', { nonNullable: true });
    protected readonly saving = signal(false);
    protected readonly hasInstallments = computed(() => this.expenses().some((expense) => expense.installment));
    protected readonly title = computed(() => {
        const count = this.expenses().length;
        const what = count === 1 ? 'despesa' : `${count} despesas`;

        return this.mode() === 'exclude' ? `Excluir ${what}` : `Restaurar ${what}`;
    });

    public constructor() {
        effect(() => {
            if (this.visible()) {
                untracked(() => this.scope.reset('all'));
            }
        });
    }

    protected confirm(): void {
        const ids = this.expenses().map((expense) => expense.id);
        const body = { ids, scope: this.scope.value };
        const request: Observable<unknown> =
            this.mode() === 'exclude' ? this.cardExpenses.exclude(body) : this.cardExpenses.restore(body);

        this.saving.set(true);

        request.subscribe({
            next: () => {
                this.saving.set(false);
                this.notifications.success(
                    this.mode() === 'exclude'
                        ? ids.length === 1
                            ? 'Despesa excluída.'
                            : `${ids.length} despesas excluídas.`
                        : ids.length === 1
                          ? 'Despesa restaurada.'
                          : `${ids.length} despesas restauradas.`,
                );
                this.done.emit();
                this.visible.set(false);
            },
            error: (error: unknown) => {
                this.saving.set(false);
                this.notifications.error(error);
            },
        });
    }
}
