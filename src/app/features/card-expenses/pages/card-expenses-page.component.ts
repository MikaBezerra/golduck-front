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
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tooltip } from 'primeng/tooltip';
import { of } from 'rxjs';

import { ApiError } from '../../../core/api/api-error';
import { SelectedMonthService } from '../../../core/month/selected-month.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { storageKey } from '../../../core/storage/storage-key';
import { remoteData } from '../../../shared/data/remote-data';
import { IsoDatePipe } from '../../../shared/date/iso-date.pipe';
import { splitLabel } from '../../../shared/expense-split/expense-split';
import { sumAmounts } from '../../../shared/money/money';
import { BrlPipe } from '../../../shared/money/brl.pipe';
import { MonthPipe } from '../../../shared/month/month.pipe';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardImportHistoryDialogComponent } from '../../card-imports/components/card-import-history-dialog.component';
import { CardImportUploadDialogComponent } from '../../card-imports/components/card-import-upload-dialog.component';
import type { CardImportResult } from '../../card-imports/data-access/card-import.models';
import { CardSyncResultComponent } from '../../card-sync/components/card-sync-result.component';
import type { CardSyncResult } from '../../card-sync/data-access/card-sync.models';
import { CardSyncService } from '../../card-sync/data-access/card-sync.service';
import { CardBankPipe } from '../../credit-cards/components/card-bank.pipe';
import { CreditCardBillDialogComponent } from '../../credit-cards/components/credit-card-bill-dialog.component';
import { CreditCardSyncStatusComponent } from '../../credit-cards/components/credit-card-sync-status.component';
import {
    BILL_SOURCE_LABELS,
    BILL_STATUS_LABELS,
    BILL_STATUS_SEVERITIES,
    canMarkBillPaid,
    type CreditCard,
    type CreditCardBillSource,
    type CreditCardBillsSummary,
    hasBillingCycle,
} from '../../credit-cards/data-access/credit-card.models';
import { CreditCardService } from '../../credit-cards/data-access/credit-card.service';
import { ExpenseLookupsService } from '../../manual-expenses/data-access/expense-lookups.service';
import { CardExpenseCreateDialogComponent } from '../components/card-expense-create-dialog.component';
import { CardExpenseEditDialogComponent } from '../components/card-expense-edit-dialog.component';
import { CardExpenseExclusionDialogComponent } from '../components/card-expense-exclusion-dialog.component';
import { CardExpenseMoveDialogComponent } from '../components/card-expense-move-dialog.component';
import type { CardExpense } from '../data-access/card-expense.models';
import { CardExpenseService } from '../data-access/card-expense.service';

const SELECTED_CARD_KEY = storageKey('selectedCard');

interface CardExpenseRow extends CardExpense {
    readonly categoryName: string;
    /** Nome da pessoa, "Compartilhada" ou "Sem pessoa". */
    readonly personName: string;
    /** Ainda sem pessoa definida (`PENDING`) e não excluída: aparece destacada. */
    readonly pending: boolean;
}

/**
 * Faturas do cartão: despesas do cartão escolhido no mês selecionado no topo.
 * As compras chegam pela sincronização com o Meu Pluggy ("Atualizar"), por "Adicionar compra" ou,
 * como plano B, pelo envio do arquivo da fatura (menu ⋮). Aqui elas ganham apelido, categoria e
 * pessoa, mudam de fatura e são excluídas ou restauradas.
 */
@Component({
    selector: 'app-card-expenses-page',
    imports: [
        DatePipe,
        FormsModule,
        RouterLink,
        Button,
        Menu,
        Select,
        TableModule,
        Tag,
        ToggleSwitch,
        Tooltip,
        BrlPipe,
        CardBankPipe,
        IsoDatePipe,
        MonthPipe,
        PageHeaderComponent,
        CardExpenseCreateDialogComponent,
        CardExpenseEditDialogComponent,
        CardExpenseExclusionDialogComponent,
        CardExpenseMoveDialogComponent,
        CardImportUploadDialogComponent,
        CardImportHistoryDialogComponent,
        CardSyncResultComponent,
        CreditCardBillDialogComponent,
        CreditCardSyncStatusComponent,
    ],
    providers: [ExpenseLookupsService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './card-expenses-page.component.html',
})
export class CardExpensesPageComponent implements OnInit {
    private readonly cardExpenseService = inject(CardExpenseService);
    private readonly creditCardService = inject(CreditCardService);
    private readonly cardSyncService = inject(CardSyncService);
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
    protected readonly billSourceLabels = BILL_SOURCE_LABELS;
    /*
     * Ids em computeds próprios: atualizar a situação de um cartão (depois de sincronizar) troca o
     * objeto do cartão, mas não o id, e assim não dispara outra busca das despesas e da fatura.
     */
    private readonly currentCardId = computed(() => this.selectedCard()?.id ?? null);
    private readonly billCardId = computed(() => {
        const card = this.selectedCard();

        return card && hasBillingCycle(card) ? card.id : null;
    });

    /** Excluídas ficam escondidas; com isto ligado, aparecem para poder restaurar. */
    protected readonly showExcluded = signal(false);

    protected togglePendingFilter(): void {
        this.pendingFilter.update((value) => !value);
    }

    protected readonly expenses = remoteData({
        params: () => ({
            month: this.month(),
            cardId: this.currentCardId(),
            includeExcluded: this.showExcluded(),
        }),
        load: ({ month, cardId, includeExcluded }) =>
            cardId ? this.cardExpenseService.findByMonth(month, cardId, includeExcluded) : of([]),
        initialValue: [] as CardExpense[],
    });

    /** Período da fatura do mês. Só existe com o vencimento e o melhor dia do cartão preenchidos. */
    protected readonly bill = remoteData({
        params: () => ({ month: this.month(), cardId: this.billCardId() }),
        load: ({ month, cardId }) => (cardId ? this.creditCardService.findBill(cardId, month) : of(null)),
        initialValue: null,
    });

    /** Faturas do mês de todos os cartões (total, situação e limite); daqui sai a situação do cartão da tela. */
    protected readonly billsSummary = remoteData({
        params: () => this.month(),
        load: (month) => this.creditCardService.summarizeBills(month),
        initialValue: null as CreditCardBillsSummary | null,
    });
    protected readonly billStatus = computed(
        () => this.billsSummary.value()?.cards.find((item) => item.cardId === this.currentCardId()) ?? null,
    );
    protected readonly billStatusLabels = BILL_STATUS_LABELS;
    protected readonly billStatusSeverities = BILL_STATUS_SEVERITIES;
    protected readonly canMarkBillPaid = canMarkBillPaid;
    /** Marcando ou desmarcando o pagamento (desabilita os botões). */
    protected readonly savingPayment = signal(false);

    protected readonly rows = computed<CardExpenseRow[]>(() => {
        const categories = this.lookups.categoryById();
        const people = this.lookups.personById();

        const rows = this.expenses.value().map((expense) => ({
            ...expense,
            categoryName: categories.get(expense.categoryId)?.name ?? '…',
            personName: splitLabel(expense, (id) => people.get(id)?.name),
            pending: expense.split === 'PENDING' && !expense.excluded,
        }));

        return this.onlyPending() ? rows.filter((row) => row.pending) : rows;
    });

    /** Compras da fatura ainda sem pessoa (as excluídas não contam, como no back). */
    protected readonly pendingCount = computed(
        () => this.expenses.value().filter((expense) => expense.split === 'PENDING' && !expense.excluded).length,
    );
    /** Liga o filtro "só as sem pessoa"; desliga sozinho quando não sobra nenhuma. */
    private readonly pendingFilter = signal(false);
    protected readonly onlyPending = computed(() => this.pendingFilter() && this.pendingCount() > 0);
    /** Excluídas não entram no total (como no back). */
    protected readonly total = computed(() =>
        sumAmounts(
            this.expenses
                .value()
                .filter((expense) => !expense.excluded)
                .map((expense) => expense.amount),
        ),
    );

    protected readonly selected = signal<CardExpenseRow[]>([]);
    protected readonly selectedTotal = computed(() => sumAmounts(this.selected().map((expense) => expense.amount)));

    protected readonly syncing = signal<'card' | 'all' | null>(null);
    /** Resultado da última sincronização pedida nesta tela; `null` esconde o painel. */
    protected readonly syncResults = signal<readonly CardSyncResult[] | null>(null);

    protected readonly createVisible = signal(false);
    protected readonly editVisible = signal(false);
    protected readonly editing = signal<CardExpense[]>([]);
    protected readonly moveVisible = signal(false);
    protected readonly moving = signal<CardExpense | null>(null);
    protected readonly billVisible = signal(false);
    protected readonly uploadVisible = signal(false);
    protected readonly historyVisible = signal(false);
    protected readonly exclusionVisible = signal(false);
    protected readonly exclusionMode = signal<'exclude' | 'restore'>('exclude');
    protected readonly exclusionTargets = signal<CardExpense[]>([]);

    /** Ações menos usadas, no menu ⋮: "Atualizar todos" e o envio de fatura (plano B). */
    protected readonly moreActions = computed<MenuItem[]>(() => [
        {
            label: 'Atualizar todos os cartões',
            icon: 'pi pi-sync',
            disabled: this.syncing() !== null,
            command: () => this.syncAll(),
        },
        { separator: true },
        {
            label: 'Enviar fatura (arquivo)',
            icon: 'pi pi-upload',
            command: () => this.uploadVisible.set(true),
        },
        { label: 'Envios de fatura', icon: 'pi pi-history', command: () => this.historyVisible.set(true) },
    ]);

    public constructor() {
        // Trocou de mês ou de cartão: a seleção anterior não vale mais.
        effect(() => {
            this.month();
            this.selectedCardId();
            this.showExcluded();
            untracked(() => this.selected.set([]));
        });
    }

    public ngOnInit(): void {
        this.lookups.load();
        this.loadCards();
    }

    protected selectCard(cardId: string | null): void {
        this.selectedCardId.set(cardId);
        storeCardId(cardId);
    }

    protected hasBillingCycle(card: CreditCard): boolean {
        return hasBillingCycle(card);
    }

    protected billSourceSeverity(source: CreditCardBillSource): 'success' | 'info' | 'secondary' {
        return source === 'bank' ? 'success' : source === 'user' ? 'info' : 'secondary';
    }

    /** Botão "Atualizar": sincroniza o cartão da tela com o Meu Pluggy. */
    protected syncCard(): void {
        const card = this.selectedCard();

        if (!card || this.syncing()) {
            return;
        }

        this.syncing.set('card');

        this.cardSyncService.syncCard(card.id).subscribe({
            next: (result) => {
                this.syncing.set(null);
                this.applySyncResults([result]);
            },
            error: (error: unknown) => {
                this.syncing.set(null);

                const apiError = ApiError.from(error);

                // O erro aparece no painel, junto com a dica do que fazer; o cartão guardou a mensagem em `sync.error`.
                this.syncResults.set([
                    {
                        cardId: card.id,
                        cardName: card.name,
                        summary: null,
                        error: { code: apiError.code, message: apiError.userMessage },
                        sync: card.sync,
                    },
                ]);
                this.loadCards();
            },
        });
    }

    /** "Atualizar todos": o erro de um cartão vem no resultado dele, sem derrubar os outros. */
    protected syncAll(): void {
        if (this.syncing()) {
            return;
        }

        this.syncing.set('all');

        this.cardSyncService.syncAll().subscribe({
            next: (results) => {
                this.syncing.set(null);
                this.applySyncResults(results);
            },
            error: (error: unknown) => {
                this.syncing.set(null);
                this.notifications.error(error);
            },
        });
    }

    protected openCreate(): void {
        this.createVisible.set(true);
    }

    /** Marca a fatura do mês como paga; marcar de novo confirma um total que mudou depois do pagamento. */
    protected markBillPaid(): void {
        this.changePayment(true);
    }

    protected unmarkBillPaid(): void {
        this.changePayment(false);
    }

    /** Depois de "Adicionar compra", mostra a fatura em que a compra entrou. */
    protected afterCreate(month: string): void {
        if (month !== this.month()) {
            this.selectedMonth.set(month);
        }

        this.afterChange();
    }

    protected openEdit(expenses: CardExpense[]): void {
        this.editing.set(expenses);
        this.editVisible.set(true);
    }

    protected openMove(expense: CardExpense): void {
        this.moving.set(expense);
        this.moveVisible.set(true);
    }

    protected openExclusion(mode: 'exclude' | 'restore', expenses: CardExpense[]): void {
        this.exclusionMode.set(mode);
        this.exclusionTargets.set(expenses);
        this.exclusionVisible.set(true);
    }

    /** Ajustou o melhor dia da fatura: sincroniza para as compras irem para a fatura certa. */
    protected afterBillChange(): void {
        if (this.selectedCard()?.sync.configured) {
            this.syncCard();
        } else {
            this.bill.reload();
        }
    }

    protected afterChange(): void {
        this.selected.set([]);
        this.expenses.reload();
        this.billsSummary.reload();
    }

    /** Depois de um envio, mostra o mês da fatura enviada. */
    protected afterImport(result: CardImportResult): void {
        if (result.import.month !== this.month()) {
            this.selectedMonth.set(result.import.month);
        }

        this.afterChange();
    }

    private changePayment(paid: boolean): void {
        const cardId = this.currentCardId();

        if (!cardId || this.savingPayment()) {
            return;
        }

        const month = this.month();
        const request = paid
            ? this.creditCardService.markBillPaid(cardId, month)
            : this.creditCardService.unmarkBillPaid(cardId, month);

        this.savingPayment.set(true);

        request.subscribe({
            next: () => {
                this.savingPayment.set(false);
                this.notifications.success(paid ? 'Fatura marcada como paga.' : 'Pagamento da fatura desmarcado.');
                this.billsSummary.reload();
            },
            error: (error: unknown) => {
                this.savingPayment.set(false);
                this.notifications.error(error);
                this.billsSummary.reload();
            },
        });
    }

    private loadCards(): void {
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

    /** Mostra o resultado, atualiza a situação de cada cartão e recarrega a fatura da tela. */
    private applySyncResults(results: readonly CardSyncResult[]): void {
        const syncById = new Map(results.map((result) => [result.cardId, result.sync]));

        this.syncResults.set(results);
        this.cards.update((cards) =>
            cards.map((card) => {
                const sync = syncById.get(card.id);

                return sync ? { ...card, sync } : card;
            }),
        );
        this.bill.reload();
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
