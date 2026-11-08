import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    type OnInit,
    signal,
    untracked,
} from '@angular/core';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';

import { SelectedMonthService } from '../../../core/month/selected-month.service';
import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { remoteData } from '../../../shared/data/remote-data';
import { splitLabel } from '../../../shared/expense-split/expense-split';
import { sumAmounts } from '../../../shared/money/money';
import { BrlPipe } from '../../../shared/money/brl.pipe';
import { MonthPipe } from '../../../shared/month/month.pipe';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { ExpenseBulkEditDialogComponent } from '../components/expense-bulk-edit-dialog.component';
import { ExpenseFormDialogComponent } from '../components/expense-form-dialog.component';
import { ExpenseLookupsService } from '../data-access/expense-lookups.service';
import type { ManualExpense } from '../data-access/manual-expense.models';
import { ManualExpenseService } from '../data-access/manual-expense.service';

/** Despesa pronta para a tabela: já com os nomes de categoria e pessoa. */
interface ExpenseRow extends ManualExpense {
    readonly categoryName: string;
    /** Nome da pessoa ou "Compartilhada". */
    readonly personName: string;
}

/** Despesas do mês selecionado no topo, com seleção múltipla para editar ou excluir em lote. */
@Component({
    selector: 'app-manual-expenses-page',
    imports: [
        Button,
        TableModule,
        Tooltip,
        BrlPipe,
        MonthPipe,
        PageHeaderComponent,
        ExpenseFormDialogComponent,
        ExpenseBulkEditDialogComponent,
    ],
    providers: [ExpenseLookupsService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './manual-expenses-page.component.html',
})
export class ManualExpensesPageComponent implements OnInit {
    private readonly expenseService = inject(ManualExpenseService);
    private readonly notifications = inject(NotificationService);
    private readonly confirm = inject(ConfirmService);
    private readonly lookups = inject(ExpenseLookupsService);

    protected readonly month = inject(SelectedMonthService).month;
    protected readonly expenses = remoteData({
        params: () => this.month(),
        load: (month) => this.expenseService.findByMonth(month),
        initialValue: [] as ManualExpense[],
    });

    protected readonly rows = computed<ExpenseRow[]>(() => {
        const categories = this.lookups.categoryById();
        const people = this.lookups.personById();

        return this.expenses.value().map((expense) => ({
            ...expense,
            categoryName: categories.get(expense.categoryId)?.name ?? '…',
            personName: splitLabel(expense, (id) => people.get(id)?.name),
        }));
    });
    protected readonly total = computed(() => sumAmounts(this.expenses.value().map((expense) => expense.amount)));

    protected readonly selected = signal<ExpenseRow[]>([]);
    protected readonly selectedTotal = computed(() => sumAmounts(this.selected().map((expense) => expense.amount)));

    protected readonly formVisible = signal(false);
    protected readonly editing = signal<ManualExpense | null>(null);
    protected readonly bulkVisible = signal(false);

    public constructor() {
        // Trocou de mês: a seleção do mês anterior não vale mais.
        effect(() => {
            this.month();
            untracked(() => this.selected.set([]));
        });
    }

    public ngOnInit(): void {
        this.lookups.load();
    }

    protected openCreate(): void {
        this.editing.set(null);
        this.formVisible.set(true);
    }

    protected openEdit(expense: ManualExpense): void {
        this.editing.set(expense);
        this.formVisible.set(true);
    }

    protected openBulkEdit(): void {
        this.bulkVisible.set(true);
    }

    protected afterSave(): void {
        this.selected.set([]);
        this.expenses.reload();
    }

    protected async remove(expense: ManualExpense): Promise<void> {
        const confirmed = await this.confirm.danger({
            header: 'Excluir despesa',
            message: `Excluir "${expense.title}"? Essa ação não pode ser desfeita.`,
            acceptLabel: 'Excluir',
        });

        if (confirmed) {
            this.deleteMany([expense.id], 'Despesa excluída.');
        }
    }

    protected async removeSelected(): Promise<void> {
        const ids = this.selected().map((expense) => expense.id);
        const confirmed = await this.confirm.danger({
            header: 'Excluir despesas',
            message: `Excluir ${ids.length} ${ids.length === 1 ? 'despesa selecionada' : 'despesas selecionadas'}? Essa ação não pode ser desfeita.`,
            acceptLabel: 'Excluir',
        });

        if (confirmed) {
            this.deleteMany(ids, ids.length === 1 ? '1 despesa excluída.' : `${ids.length} despesas excluídas.`);
        }
    }

    private deleteMany(ids: string[], successMessage: string): void {
        this.expenseService.deleteMany(ids).subscribe({
            next: () => {
                this.notifications.success(successMessage);
                this.afterSave();
            },
            error: (error: unknown) => {
                this.notifications.error(error);
                this.afterSave();
            },
        });
    }
}
