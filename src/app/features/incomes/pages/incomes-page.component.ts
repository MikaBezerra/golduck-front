import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';

import { SelectedMonthService } from '../../../core/month/selected-month.service';
import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { remoteData } from '../../../shared/data/remote-data';
import { sumAmounts } from '../../../shared/money/money';
import { BrlPipe } from '../../../shared/money/brl.pipe';
import { addMonths, formatMonth, parseMonthKey, toMonthKey } from '../../../shared/month/month';
import { MonthPipe } from '../../../shared/month/month.pipe';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { IncomeFormDialogComponent } from '../components/income-form-dialog.component';
import type { Income } from '../data-access/income.models';
import { IncomeService } from '../data-access/income.service';

interface IncomeRow {
    /** `"AAAA-MM"` */
    readonly month: string;
    /** 1 a 12 */
    readonly monthNumber: number;
    readonly income: Income | null;
    readonly selected: boolean;
}

/**
 * Entradas do ano: uma linha por mês, com ou sem valor cadastrado.
 * O ano acompanha o mês escolhido no topo da tela.
 */
@Component({
    selector: 'app-incomes-page',
    imports: [Button, TableModule, Tooltip, BrlPipe, MonthPipe, PageHeaderComponent, IncomeFormDialogComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './incomes-page.component.html',
})
export class IncomesPageComponent {
    private readonly incomeService = inject(IncomeService);
    private readonly selectedMonth = inject(SelectedMonthService);
    private readonly notifications = inject(NotificationService);
    private readonly confirm = inject(ConfirmService);

    protected readonly year = this.selectedMonth.year;
    protected readonly incomes = remoteData({
        params: () => this.year(),
        load: (year) => this.incomeService.findByYear(year),
        initialValue: [] as Income[],
    });

    protected readonly rows = computed<IncomeRow[]>(() => {
        const year = this.year();
        const selected = this.selectedMonth.month();
        const byMonth = new Map(this.incomes.value().map((income) => [income.month, income]));

        return Array.from({ length: 12 }, (_, index) => {
            const month = toMonthKey(year, index + 1);

            return { month, monthNumber: index + 1, income: byMonth.get(month) ?? null, selected: month === selected };
        });
    });
    protected readonly total = computed(() => sumAmounts(this.incomes.value().map((income) => income.amount)));
    protected readonly takenMonths = computed(() =>
        this.incomes.value().map((income) => parseMonthKey(income.month).month),
    );

    protected readonly dialogVisible = signal(false);
    protected readonly editing = signal<Income | null>(null);
    protected readonly presetMonths = signal<number[]>([]);

    protected previousYear(): void {
        this.selectedMonth.set(addMonths(this.selectedMonth.month(), -12));
    }

    protected nextYear(): void {
        this.selectedMonth.set(addMonths(this.selectedMonth.month(), 12));
    }

    protected openCreate(presetMonths: number[] = []): void {
        this.editing.set(null);
        this.presetMonths.set(presetMonths);
        this.dialogVisible.set(true);
    }

    protected openEdit(income: Income): void {
        this.editing.set(income);
        this.dialogVisible.set(true);
    }

    protected async remove(income: Income): Promise<void> {
        const confirmed = await this.confirm.danger({
            header: 'Excluir entrada',
            message: `Excluir a entrada de ${formatMonth(income.month)}? Essa ação não pode ser desfeita.`,
            acceptLabel: 'Excluir',
        });

        if (!confirmed) {
            return;
        }

        this.incomeService.delete(income.month).subscribe({
            next: () => {
                this.notifications.success('Entrada excluída.');
                this.incomes.reload();
            },
            error: (error: unknown) => this.notifications.error(error),
        });
    }
}
