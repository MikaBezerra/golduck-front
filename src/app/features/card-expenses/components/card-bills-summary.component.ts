import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Tag } from 'primeng/tag';

import { BrlPipe } from '../../../shared/money/brl.pipe';
import { MonthPipe } from '../../../shared/month/month.pipe';
import {
    BILL_STATUS_LABELS,
    BILL_STATUS_SEVERITIES,
    type CreditCardBillsSummary,
    type CreditCardBillSummaryItem,
    type LimitUsage,
    limitUsage,
} from '../../credit-cards/data-access/credit-card.models';

interface SummaryCard extends CreditCardBillSummaryItem {
    readonly usage: LimitUsage | null;
}

/**
 * Topo da tela de Faturas: a fatura do mês de cada cartão (total e situação), o total geral e o limite
 * disponível de hoje. Clicar num cartão mostra as compras dele logo abaixo.
 */
@Component({
    selector: 'app-card-bills-summary',
    imports: [Tag, BrlPipe, MonthPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="mb-4 surface-card p-4" aria-labelledby="bills-summary-title">
            <div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="bills-summary-title" class="m-0 text-base font-semibold">
                    Faturas de {{ summary().month | month }}
                </h2>
                <p class="m-0 text-sm text-muted-color">
                    Total geral
                    <span class="ml-1 font-display text-xl font-semibold text-white tabular-nums">{{
                        summary().total | brl
                    }}</span>
                </p>
            </div>

            <ul class="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
                @for (card of cards(); track card.cardId) {
                    <li>
                        <button
                            type="button"
                            class="flex w-full cursor-pointer flex-col disabled:cursor-default gap-2 rounded-xl border bg-white/[0.02] px-3 py-2.5 text-left text-inherit transition-colors hover:bg-white/[0.05]"
                            [class.border-primary]="card.cardId === selectedCardId()"
                            [class.border-line]="card.cardId !== selectedCardId()"
                            [attr.aria-pressed]="card.cardId === selectedCardId()"
                            [disabled]="!card.active"
                            (click)="cardSelected.emit(card.cardId)"
                        >
                            <span class="flex items-center justify-between gap-2">
                                <span class="truncate font-medium">
                                    {{ card.cardName }}
                                    @if (!card.active) {
                                        <span class="text-xs text-muted-color">(inativo)</span>
                                    }
                                </span>
                                <p-tag
                                    [value]="statusLabels[card.status]"
                                    [severity]="statusSeverities[card.status]"
                                    [icon]="card.status === 'paid' ? 'pi pi-check-circle' : ''"
                                />
                            </span>
                            <span class="font-display text-lg font-semibold tabular-nums">{{ card.total | brl }}</span>
                            @if (card.usage; as usage) {
                                <span class="h-1.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
                                    <span
                                        class="block h-full rounded-full"
                                        [class.bg-reserve]="!usage.exceeded"
                                        [class.bg-expense]="usage.exceeded"
                                        [style.width.%]="usage.usedPercent"
                                    ></span>
                                </span>
                                <span
                                    class="text-xs"
                                    [class.text-muted-color]="!usage.exceeded"
                                    [class.text-negative]="usage.exceeded"
                                >
                                    @if (usage.exceeded) {
                                        <i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>
                                        Limite estourado em {{ negate(card.availableLimit) | brl }}
                                    } @else {
                                        Disponível {{ card.availableLimit ?? '0' | brl }} de
                                        {{ card.creditLimit ?? '0' | brl }}
                                    }
                                </span>
                            } @else {
                                <span class="text-xs text-muted-color">Sem limite cadastrado</span>
                            }
                        </button>
                    </li>
                }
            </ul>
            @if (hasLimits()) {
                <p class="mt-2 mb-0 text-xs text-muted-color">
                    O disponível é o de hoje: limite menos as faturas não pagas deste mês em diante.
                </p>
            }
        </section>
    `,
})
export class CardBillsSummaryComponent {
    public readonly summary = input.required<CreditCardBillsSummary>();
    public readonly selectedCardId = input<string | null>(null);
    public readonly cardSelected = output<string>();

    protected readonly statusLabels = BILL_STATUS_LABELS;
    protected readonly statusSeverities = BILL_STATUS_SEVERITIES;
    protected readonly cards = computed<SummaryCard[]>(() =>
        this.summary().cards.map((card) => ({ ...card, usage: limitUsage(card.creditLimit, card.availableLimit) })),
    );
    protected readonly hasLimits = computed(() => this.cards().some((card) => card.usage !== null));

    /** Disponível negativo → quanto passou do limite (positivo). */
    protected negate(amount: string | null): string {
        return amount?.startsWith('-') ? amount.slice(1) : (amount ?? '0');
    }
}
