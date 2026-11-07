import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { TableModule } from 'primeng/table';

import { SelectedMonthService } from '../../../core/month/selected-month.service';
import { remoteData } from '../../../shared/data/remote-data';
import { sumAmounts } from '../../../shared/money/money';
import { BrlPipe } from '../../../shared/money/brl.pipe';
import { addMonths, parseMonthKey, toMonthKey } from '../../../shared/month/month';
import { MonthPipe } from '../../../shared/month/month.pipe';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import type { Reserve, ReserveList } from '../../reserves/data-access/reserve.models';
import { ReserveService } from '../../reserves/data-access/reserve.service';
import {
    type MonthlyAmount,
    MonthlyAmountFormDialogComponent,
    type MonthlyAmountKind,
} from '../components/monthly-amount-form-dialog.component';
import type { Income } from '../data-access/income.models';
import { IncomeService } from '../data-access/income.service';

interface IncomeRow {
    /** `"AAAA-MM"` */
    readonly month: string;
    /** 1 a 12 */
    readonly monthNumber: number;
    readonly income: Income | null;
    readonly reserve: Reserve | null;
    readonly selected: boolean;
}

/**
 * Entradas e reservas do ano: uma linha por mês, com ou sem valor cadastrado.
 * Clicar num valor edita (ou exclui); clicar em "Adicionar" cadastra naquele mês.
 * O ano acompanha o mês escolhido no topo da tela.
 */
@Component({
    selector: 'app-incomes-page',
    imports: [Button, Message, TableModule, BrlPipe, MonthPipe, PageHeaderComponent, MonthlyAmountFormDialogComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './incomes-page.component.html',
})
export class IncomesPageComponent {
    private readonly incomeService = inject(IncomeService);
    private readonly reserveService = inject(ReserveService);
    private readonly selectedMonth = inject(SelectedMonthService);

    protected readonly year = this.selectedMonth.year;
    protected readonly incomes = remoteData({
        params: () => this.year(),
        load: (year) => this.incomeService.findByYear(year),
        initialValue: [] as Income[],
    });
    protected readonly reserves = remoteData({
        params: () => this.year(),
        load: (year) => this.reserveService.findByYear(year),
        initialValue: { available: true, items: [] } as ReserveList,
    });
    /** O back ainda não tem o endpoint de reservas. */
    protected readonly reservesUnavailable = computed(() => !this.reserves.value().available);

    protected readonly rows = computed<IncomeRow[]>(() => {
        const year = this.year();
        const selected = this.selectedMonth.month();
        const incomeByMonth = new Map(this.incomes.value().map((income) => [income.month, income]));
        const reserveByMonth = new Map(this.reserves.value().items.map((reserve) => [reserve.month, reserve]));

        return Array.from({ length: 12 }, (_, index) => {
            const month = toMonthKey(year, index + 1);

            return {
                month,
                monthNumber: index + 1,
                income: incomeByMonth.get(month) ?? null,
                reserve: reserveByMonth.get(month) ?? null,
                selected: month === selected,
            };
        });
    });
    protected readonly incomeTotal = computed(() => sumAmounts(this.incomes.value().map((income) => income.amount)));
    protected readonly reserveTotal = computed(() =>
        sumAmounts(this.reserves.value().items.map((reserve) => reserve.amount)),
    );

    protected readonly dialogVisible = signal(false);
    protected readonly dialogKind = signal<MonthlyAmountKind>('income');
    protected readonly editing = signal<MonthlyAmount | null>(null);
    protected readonly presetMonths = signal<number[]>([]);
    /** Meses que já têm valor do tipo aberto no diálogo (ficam bloqueados no cadastro). */
    protected readonly takenMonths = computed(() => {
        const items = this.dialogKind() === 'income' ? this.incomes.value() : this.reserves.value().items;

        return items.map((item) => parseMonthKey(item.month).month);
    });

    /** Valor clicável (abre a edição): parece texto, com um lápis discreto ao lado. */
    protected readonly valueButtonClass =
        'inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent px-2 py-1 font-sans ' +
        'font-medium whitespace-nowrap text-color tabular-nums transition-colors hover:bg-white/[0.06]';

    protected previousYear(): void {
        this.selectedMonth.set(addMonths(this.selectedMonth.month(), -12));
    }

    protected nextYear(): void {
        this.selectedMonth.set(addMonths(this.selectedMonth.month(), 12));
    }

    protected openCreate(kind: MonthlyAmountKind, presetMonths: number[] = []): void {
        this.dialogKind.set(kind);
        this.editing.set(null);
        this.presetMonths.set(presetMonths);
        this.dialogVisible.set(true);
    }

    protected openEdit(kind: MonthlyAmountKind, entry: MonthlyAmount): void {
        this.dialogKind.set(kind);
        this.editing.set(entry);
        this.dialogVisible.set(true);
    }

    protected afterSave(): void {
        if (this.dialogKind() === 'income') {
            this.incomes.reload();
        } else {
            this.reserves.reload();
        }
    }
}
