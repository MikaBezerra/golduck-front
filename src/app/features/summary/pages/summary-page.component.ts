import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { SelectButton } from 'primeng/selectbutton';
import { Skeleton } from 'primeng/skeleton';

import { SelectedMonthService } from '../../../core/month/selected-month.service';
import { remoteData } from '../../../shared/data/remote-data';
import { amountRatio, amountToCents, formatBrl } from '../../../shared/money/money';
import { BrlPipe } from '../../../shared/money/brl.pipe';
import { addMonths, formatMonth, formatMonthShort } from '../../../shared/month/month';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import type { ReserveTotals } from '../../reserves/data-access/reserve.models';
import { ReserveService } from '../../reserves/data-access/reserve.service';
import { SparklineComponent } from '../components/sparkline.component';
import { SummaryBarListComponent } from '../components/summary-bar-list.component';
import { SummaryNetCardsComponent } from '../components/summary-net-cards.component';
import { SummaryYearChartComponent } from '../components/summary-year-chart.component';
import {
    amountDelta,
    type AmountDelta,
    categoryBars,
    formatPercent,
    monthIndex,
    netCards,
    personBars,
} from '../data-access/summary-view';
import {
    type AnnualSummary,
    type Summary,
    SUMMARY_MODE_OPTIONS,
    type SummaryMode,
    type SummaryTotals,
} from '../data-access/summary.models';
import { SummaryService } from '../data-access/summary.service';

const MODE_STORAGE_KEY = 'financas.summaryMode';

/** Os números do topo: do mês escolhido ou do ano inteiro. */
interface Headline {
    readonly income: string | null;
    /** null = nada guardado no período. */
    readonly reserve: string | null;
    readonly expensesTotal: string;
    readonly expensesCount: number;
    readonly balance: string;
}

/**
 * Página inicial: o resumo do mês escolhido no topo da tela, ou do ano inteiro.
 *
 * Duas buscas: o resumo anual (gráfico e números de cada mês, só muda quando muda o ano)
 * e o mensal (categorias, pessoas e líquido do mês). Por isso trocar de mês no gráfico
 * atualiza os números na hora e só as listas esperam a API.
 */
@Component({
    selector: 'app-summary-page',
    imports: [
        FormsModule,
        RouterLink,
        Button,
        SelectButton,
        Skeleton,
        BrlPipe,
        PageHeaderComponent,
        SparklineComponent,
        SummaryBarListComponent,
        SummaryNetCardsComponent,
        SummaryYearChartComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './summary-page.component.html',
})
export class SummaryPageComponent {
    private readonly summaryService = inject(SummaryService);
    private readonly selectedMonth = inject(SelectedMonthService);
    private readonly reserveService = inject(ReserveService);

    protected readonly month = this.selectedMonth.month;
    protected readonly year = this.selectedMonth.year;
    protected readonly mode = signal<SummaryMode>(readMode());
    protected readonly modeOptions = [...SUMMARY_MODE_OPTIONS];

    protected readonly annual = remoteData({
        params: () => this.year(),
        load: (year) => this.summaryService.findByYear(year),
        initialValue: null as AnnualSummary | null,
    });
    protected readonly monthly = remoteData({
        params: () => this.month(),
        load: (month) => this.summaryService.findByMonth(month),
        initialValue: null as Summary | null,
    });

    /** Quanto já foi guardado no total (todos os anos), para o cartão da reserva. */
    protected readonly reserveTotals = remoteData({
        params: () => null,
        load: () => this.reserveService.totals(),
        initialValue: null as ReserveTotals | null,
    });

    /** Resumo anual do ano selecionado (null enquanto um ano novo carrega). */
    protected readonly annualCurrent = computed(() => {
        const annual = this.annual.value();

        return annual?.year === this.year() ? annual : null;
    });
    protected readonly annualFailed = computed(() => !this.annual.loading() && this.annualCurrent() === null);

    private readonly monthPosition = computed(() => monthIndex(this.month()));
    protected readonly isYear = computed(() => this.mode() === 'year');
    protected readonly subtitle = computed(() => (this.isYear() ? `Ano de ${this.year()}` : formatMonth(this.month())));

    protected readonly headline = computed<Headline | null>(() => {
        const annual = this.annualCurrent();

        if (!annual) {
            return null;
        }

        return this.isYear() ? annual : (annual.months[this.monthPosition()] ?? null);
    });
    protected readonly isEmpty = computed(() => {
        const headline = this.headline();

        return (
            headline !== null && headline.income === null && headline.expensesCount === 0 && headline.reserve === null
        );
    });

    /** Comparação com o mês anterior (só no modo Mês e a partir de fevereiro). */
    protected readonly previous = computed(() => {
        const annual = this.annualCurrent();
        const headline = this.headline();
        const position = this.monthPosition();

        if (this.isYear() || !annual || !headline || position === 0) {
            return null;
        }

        const before = annual.months[position - 1];
        const label = formatMonthShort(before.month).split('/')[0];

        return {
            income:
                before.income === null || headline.income === null
                    ? null
                    : deltaView(amountDelta(headline.income, before.income), label),
            expenses: deltaView(amountDelta(headline.expensesTotal, before.expensesTotal), label),
            reserve:
                before.reserve === null || headline.reserve === null
                    ? null
                    : deltaView(amountDelta(headline.reserve, before.reserve), label),
        };
    });

    /** Quanto da entrada as despesas consomem. */
    protected readonly incomeUsage = computed(() => {
        const headline = this.headline();

        if (!headline || headline.income === null) {
            return null;
        }

        const ratio = amountRatio(headline.expensesTotal, headline.income);

        return { width: Math.min(100, ratio * 100), label: formatPercent(ratio), over: ratio > 1 };
    });
    /** Quanto da entrada foi guardado. */
    protected readonly savedShare = computed(() => {
        const headline = this.headline();

        return headline?.income && headline.reserve
            ? formatPercent(amountRatio(headline.reserve, headline.income))
            : null;
    });
    protected readonly balanceSign = computed(() => Math.sign(amountToCents(this.headline()?.balance ?? '0')));

    /** Linhas dos minigráficos (centavos de janeiro a dezembro). */
    protected readonly trends = computed(() => {
        const months = this.annualCurrent()?.months ?? [];

        return {
            income: months.map((month) => (month.income === null ? 0 : amountToCents(month.income))),
            expenses: months.map((month) => amountToCents(month.expensesTotal)),
            reserve: months.map((month) => (month.reserve === null ? 0 : amountToCents(month.reserve))),
            balance: months.map((month) => amountToCents(month.balance)),
        };
    });
    protected readonly trendMarker = computed(() => (this.isYear() ? null : this.monthPosition()));

    /** Categorias, pessoas e líquido: do mês (resumo mensal) ou do ano (resumo anual). */
    protected readonly breakdown = computed<SummaryTotals | null>(() => {
        if (this.isYear()) {
            return this.annualCurrent();
        }

        // Ao trocar de mês, mostra o anterior apagado até o novo chegar (sem piscar a tela).
        return this.monthly.value();
    });
    protected readonly breakdownStale = computed(
        () => !this.isYear() && this.monthly.value() !== null && this.monthly.value()?.month !== this.month(),
    );
    protected readonly breakdownFailed = computed(
        () => !this.isYear() && !this.monthly.loading() && this.breakdownStale(),
    );
    protected readonly categoryBars = computed(() => {
        const totals = this.breakdown();

        return totals ? categoryBars(totals.byCategory, totals.expensesTotal) : [];
    });
    protected readonly personBars = computed(() => {
        const totals = this.breakdown();

        return totals ? personBars(totals.byPerson, totals.expensesTotal) : [];
    });
    protected readonly netCards = computed(() => netCards(this.breakdown()?.netByPerson ?? []));

    // Classes repetidas nos cartões da página.
    /** Celular: fileira com rolagem lateral (um cartão por vez, o próximo aparecendo na borda). */
    protected readonly tilesRowClass =
        '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 ' +
        'md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 2xl:grid-cols-4';
    protected readonly tileClass =
        'surface-card flex w-[86%] shrink-0 snap-center flex-col gap-2 p-5 sm:w-[60%] md:w-auto';
    protected readonly tileLabelClass =
        'm-0 flex items-center gap-2 font-sans text-xs font-semibold tracking-[0.12em] text-muted-color uppercase';
    protected readonly tileValueClass = 'm-0 font-display text-3xl font-bold tracking-tight';
    protected readonly deltaClass = 'm-0 flex items-center gap-1.5 text-sm text-muted-color';
    protected readonly deltaIcon: Record<DeltaView['direction'], string> = {
        up: 'pi pi-arrow-up-right text-xs',
        down: 'pi pi-arrow-down-right text-xs',
        same: 'pi pi-equals text-xs',
    };
    protected readonly cardTitleClass = 'm-0 px-3 pt-2 pb-3 text-lg font-semibold';
    protected readonly linkClass =
        'inline-flex items-center gap-1.5 font-medium text-primary-300 no-underline underline-offset-2 hover:underline';
    protected readonly shortcutClass =
        'inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-color no-underline ' +
        'transition-colors hover:border-cantaloupe/50 hover:bg-cantaloupe/10';

    protected setMode(mode: SummaryMode | null): void {
        if (!mode) {
            return;
        }

        this.mode.set(mode);
        storeMode(mode);
    }

    /** Mês escolhido no gráfico: vira o mês do topo da tela e o resumo passa a ser dele. */
    protected chooseMonth(month: string): void {
        this.selectedMonth.set(month);
        this.setMode('month');
    }

    protected shiftYear(delta: number): void {
        this.selectedMonth.set(addMonths(this.month(), delta * 12));
    }

    protected retry(): void {
        this.annual.reload();
        this.monthly.reload();
    }
}

interface DeltaView {
    readonly direction: AmountDelta['direction'];
    /** `R$ 340,00 a mais que out` */
    readonly text: string;
}

function deltaView(delta: AmountDelta, monthLabel: string): DeltaView {
    const text =
        delta.direction === 'same'
            ? `Igual a ${monthLabel}`
            : `${formatBrl(delta.amount)} a ${delta.direction === 'up' ? 'mais' : 'menos'} que ${monthLabel}`;

    return { direction: delta.direction, text };
}

function readMode(): SummaryMode {
    try {
        return sessionStorage.getItem(MODE_STORAGE_KEY) === 'year' ? 'year' : 'month';
    } catch {
        return 'month';
    }
}

function storeMode(mode: SummaryMode): void {
    try {
        sessionStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
        // Sem acesso ao storage: só não lembra a escolha.
    }
}
