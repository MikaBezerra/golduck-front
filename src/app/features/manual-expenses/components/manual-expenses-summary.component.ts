import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { amountRatio } from '../../../shared/money/money';
import { BrlPipe } from '../../../shared/money/brl.pipe';
import { MonthPipe } from '../../../shared/month/month.pipe';
import { formatPercent } from '../../summary/data-access/summary-view';
import type { ManualExpensesSummary } from '../data-access/manual-expense.models';

/**
 * Topo da tela de Despesas: total do mês, quanto já foi pago e quanto falta. Os números vêm prontos
 * do back (despesa não tem categoria: o total por categoria fica só nas compras do cartão).
 */
@Component({
    selector: 'app-manual-expenses-summary',
    imports: [BrlPipe, MonthPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="mb-4 surface-card p-4" aria-labelledby="expenses-summary-title">
            <h2 id="expenses-summary-title" class="m-0 mb-3 text-base font-semibold">
                Resumo de {{ summary().month | month }}
            </h2>

            <dl class="m-0 grid grid-cols-3 gap-2">
                <div class="rounded-xl bg-white/[0.03] px-3 py-2">
                    <dt class="text-xs text-muted-color">Total</dt>
                    <dd class="m-0 font-display font-semibold tabular-nums sm:text-lg">{{ summary().total | brl }}</dd>
                </div>
                <div class="rounded-xl bg-white/[0.03] px-3 py-2">
                    <dt class="text-xs text-muted-color">
                        <i class="pi pi-check-circle mr-1 text-reserve" aria-hidden="true"></i>Pago
                    </dt>
                    <dd class="m-0 font-display font-semibold tabular-nums sm:text-lg">{{ summary().paid | brl }}</dd>
                </div>
                <div class="rounded-xl bg-white/[0.03] px-3 py-2">
                    <dt class="text-xs text-muted-color">A pagar</dt>
                    <dd class="m-0 font-display font-semibold tabular-nums sm:text-lg">{{ summary().unpaid | brl }}</dd>
                </div>
            </dl>

            @if (summary().count > 0) {
                <div class="mt-3 flex items-center gap-3">
                    <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
                        <span class="block h-full rounded-full bg-reserve" [style.width.%]="paidPercent()"></span>
                    </span>
                    <span class="text-xs text-muted-color tabular-nums">{{ paidShare() }} pago</span>
                </div>
            }
        </section>
    `,
})
export class ManualExpensesSummaryComponent {
    public readonly summary = input.required<ManualExpensesSummary>();

    private readonly paidRatio = computed(() => amountRatio(this.summary().paid, this.summary().total));
    protected readonly paidPercent = computed(() => this.paidRatio() * 100);
    protected readonly paidShare = computed(() => formatPercent(this.paidRatio()));
}
