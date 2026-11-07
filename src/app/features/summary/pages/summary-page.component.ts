import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';

import { SelectedMonthService } from '../../../core/month/selected-month.service';
import { remoteData } from '../../../shared/data/remote-data';
import { amountRatio, amountToCents } from '../../../shared/money/money';
import { BrlPipe } from '../../../shared/money/brl.pipe';
import { MonthPipe } from '../../../shared/month/month.pipe';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { SummaryBarListComponent } from '../components/summary-bar-list.component';
import { SummaryNetTableComponent } from '../components/summary-net-table.component';
import { categoryBars, formatPercent, netRows, personBars } from '../data-access/summary-view';
import type { Summary } from '../data-access/summary.models';
import { SummaryService } from '../data-access/summary.service';

interface IncomeUsage {
    /** Largura do medidor em % (no máximo 100). */
    readonly width: number;
    readonly label: string;
    /** As despesas passaram da entrada. */
    readonly over: boolean;
}

/**
 * Página inicial: o resumo do mês escolhido no topo da tela.
 * Números do mês, para onde foi o dinheiro (categoria e pessoa) e quanto sobra para cada pessoa.
 */
@Component({
    selector: 'app-summary-page',
    imports: [
        RouterLink,
        Button,
        Skeleton,
        BrlPipe,
        MonthPipe,
        PageHeaderComponent,
        SummaryBarListComponent,
        SummaryNetTableComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './summary-page.component.html',
})
export class SummaryPageComponent {
    private readonly summaryService = inject(SummaryService);
    private readonly selectedMonth = inject(SelectedMonthService);

    protected readonly month = this.selectedMonth.month;
    protected readonly summary = remoteData({
        params: () => this.month(),
        load: (month) => this.summaryService.findByMonth(month),
        initialValue: null as Summary | null,
    });

    /** Resumo do mês selecionado. Fica null enquanto um mês novo carrega, para nunca mostrar números de outro mês. */
    protected readonly current = computed(() => {
        const summary = this.summary.value();

        return summary?.month === this.month() ? summary : null;
    });
    protected readonly failed = computed(() => !this.summary.loading() && this.current() === null);
    protected readonly isEmpty = computed(() => {
        const summary = this.current();

        return summary !== null && summary.income === null && summary.expensesCount === 0;
    });

    /** Quanto da entrada as despesas consomem. */
    protected readonly incomeUsage = computed<IncomeUsage | null>(() => {
        const summary = this.current();

        if (summary === null || summary.income === null) {
            return null;
        }

        const ratio = amountRatio(summary.expensesTotal, summary.income);

        return { width: Math.min(100, ratio * 100), label: formatPercent(ratio), over: ratio > 1 };
    });
    /** -1, 0 ou 1: saldo negativo, zerado ou positivo. */
    protected readonly balanceSign = computed(() => Math.sign(amountToCents(this.current()?.balance ?? '0')));

    protected readonly categoryBars = computed(() => {
        const summary = this.current();

        return summary ? categoryBars(summary.byCategory, summary.expensesTotal) : [];
    });
    protected readonly personBars = computed(() => {
        const summary = this.current();

        return summary ? personBars(summary.byPerson, summary.expensesTotal) : [];
    });
    protected readonly netRows = computed(() => netRows(this.current()?.netByPerson ?? []));

    // Classes repetidas nos cartões da página.
    protected readonly cardClass = 'flex flex-col rounded-xl border border-surface bg-surface-0 p-5';
    protected readonly cardTitleClass = 'mt-0 mb-4 text-base font-semibold';
    protected readonly tileClass = 'flex flex-col gap-3 rounded-xl border border-surface bg-surface-0 p-5';
    protected readonly tileLabelClass = 'm-0 text-sm font-medium text-muted-color';
    protected readonly tileValueClass = 'm-0 text-2xl font-semibold';
    protected readonly linkClass = 'font-medium text-primary-700 underline-offset-2 hover:underline';
    protected readonly shortcutClass =
        'inline-flex items-center gap-2 rounded-border border border-surface px-4 py-2 text-color no-underline ' +
        'transition-colors hover:bg-emphasis';
}
