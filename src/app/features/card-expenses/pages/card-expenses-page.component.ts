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
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import { of } from 'rxjs';

import { SelectedMonthService } from '../../../core/month/selected-month.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { remoteData } from '../../../shared/data/remote-data';
import { IsoDatePipe } from '../../../shared/date/iso-date.pipe';
import { sumAmounts } from '../../../shared/money/money';
import { BrlPipe } from '../../../shared/money/brl.pipe';
import { MonthPipe } from '../../../shared/month/month.pipe';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardImportHistoryDialogComponent } from '../../card-imports/components/card-import-history-dialog.component';
import { CardImportManualDialogComponent } from '../../card-imports/components/card-import-manual-dialog.component';
import { CardImportUploadDialogComponent } from '../../card-imports/components/card-import-upload-dialog.component';
import type { CardImportResult } from '../../card-imports/data-access/card-import.models';
import { CardBankPipe } from '../../credit-cards/components/card-bank.pipe';
import type { CreditCard } from '../../credit-cards/data-access/credit-card.models';
import { CreditCardService } from '../../credit-cards/data-access/credit-card.service';
import { ExpenseLookupsService } from '../../manual-expenses/data-access/expense-lookups.service';
import { CardExpenseEditDialogComponent } from '../components/card-expense-edit-dialog.component';
import type { CardExpense } from '../data-access/card-expense.models';
import { CardExpenseService } from '../data-access/card-expense.service';

const SELECTED_CARD_KEY = 'financas.selectedCard';

interface CardExpenseRow extends CardExpense {
    readonly categoryName: string;
    readonly personName: string | null;
}

/**
 * Faturas do cartão: despesas do cartão escolhido no mês selecionado no topo.
 * As despesas entram pelo envio da fatura (arquivo ou manual) e aqui só ganham
 * apelido, categoria e pessoa.
 */
@Component({
    selector: 'app-card-expenses-page',
    imports: [
        FormsModule,
        RouterLink,
        Button,
        Select,
        TableModule,
        Tag,
        Tooltip,
        BrlPipe,
        CardBankPipe,
        IsoDatePipe,
        MonthPipe,
        PageHeaderComponent,
        CardExpenseEditDialogComponent,
        CardImportUploadDialogComponent,
        CardImportManualDialogComponent,
        CardImportHistoryDialogComponent,
    ],
    providers: [ExpenseLookupsService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './card-expenses-page.component.html',
})
export class CardExpensesPageComponent implements OnInit {
    private readonly cardExpenseService = inject(CardExpenseService);
    private readonly creditCardService = inject(CreditCardService);
    private readonly notifications = inject(NotificationService);
    private readonly lookups = inject(ExpenseLookupsService);
    private readonly selectedMonth = inject(SelectedMonthService);

    protected readonly month = this.selectedMonth.month;
    protected readonly cards = signal<CreditCard[]>([]);
    protected readonly cardsLoaded = signal(false);
    protected readonly selectedCardId = signal<string | null>(readStoredCardId());
    protected readonly selectedCard = computed(
        () => this.cards().find((card) => card.id === this.selectedCardId()) ?? null,
    );

    protected readonly expenses = remoteData({
        params: () => ({ month: this.month(), cardId: this.selectedCard()?.id ?? null }),
        load: ({ month, cardId }) => (cardId ? this.cardExpenseService.findByMonth(month, cardId) : of([])),
        initialValue: [] as CardExpense[],
    });

    protected readonly rows = computed<CardExpenseRow[]>(() => {
        const categories = this.lookups.categoryById();
        const people = this.lookups.personById();

        return this.expenses.value().map((expense) => ({
            ...expense,
            categoryName: categories.get(expense.categoryId)?.name ?? '…',
            personName: expense.personId ? (people.get(expense.personId)?.name ?? '…') : null,
        }));
    });
    protected readonly total = computed(() => sumAmounts(this.expenses.value().map((expense) => expense.amount)));

    protected readonly selected = signal<CardExpenseRow[]>([]);
    protected readonly selectedTotal = computed(() => sumAmounts(this.selected().map((expense) => expense.amount)));

    protected readonly editVisible = signal(false);
    protected readonly editing = signal<CardExpense[]>([]);
    protected readonly uploadVisible = signal(false);
    protected readonly manualVisible = signal(false);
    protected readonly historyVisible = signal(false);

    public constructor() {
        // Trocou de mês ou de cartão: a seleção anterior não vale mais.
        effect(() => {
            this.month();
            this.selectedCardId();
            untracked(() => this.selected.set([]));
        });
    }

    public ngOnInit(): void {
        this.lookups.load();

        this.creditCardService.findAll().subscribe({
            next: (cards) => {
                this.cards.set(cards);
                this.cardsLoaded.set(true);

                if (!cards.some((card) => card.id === this.selectedCardId())) {
                    this.selectCard(cards[0]?.id ?? null);
                }
            },
            error: (error: unknown) => {
                this.cardsLoaded.set(true);
                this.notifications.error(error);
            },
        });
    }

    protected selectCard(cardId: string | null): void {
        this.selectedCardId.set(cardId);
        storeCardId(cardId);
    }

    protected openEdit(expenses: CardExpense[]): void {
        this.editing.set(expenses);
        this.editVisible.set(true);
    }

    protected afterChange(): void {
        this.selected.set([]);
        this.expenses.reload();
    }

    /** Depois de um envio, mostra o mês da fatura enviada. */
    protected afterImport(result: CardImportResult): void {
        if (result.import.month !== this.month()) {
            this.selectedMonth.set(result.import.month);
        }

        this.afterChange();
    }
}

function readStoredCardId(): string | null {
    try {
        return sessionStorage.getItem(SELECTED_CARD_KEY);
    } catch {
        return null;
    }
}

function storeCardId(cardId: string | null): void {
    try {
        if (cardId) {
            sessionStorage.setItem(SELECTED_CARD_KEY, cardId);
        } else {
            sessionStorage.removeItem(SELECTED_CARD_KEY);
        }
    } catch {
        // Sem storage: só não lembra o cartão escolhido.
    }
}
