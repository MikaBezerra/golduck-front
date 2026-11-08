import type { Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { SelectedMonthService } from '../../../core/month/selected-month.service';
import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { apiError, internals, renderComponent } from '../../../../testing/components';
import {
    aBillSummaryItem,
    aCardBill,
    aCardExpense,
    aCardSync,
    aCategory,
    aCreditCard,
    aSyncedCreditCard,
} from '../../../../testing/fixtures';
import { confirmMock, notificationsMock, type NotificationsMock } from '../../../../testing/mocks';
import { CardImportService } from '../../card-imports/data-access/card-import.service';
import type { CardSyncResult } from '../../card-sync/data-access/card-sync.models';
import { CardSyncService } from '../../card-sync/data-access/card-sync.service';
import { CategoryService } from '../../categories/data-access/category.service';
import type { CreditCard, CreditCardBillSummaryItem } from '../../credit-cards/data-access/credit-card.models';
import { CreditCardService } from '../../credit-cards/data-access/credit-card.service';
import { PersonService } from '../../people/data-access/person.service';
import type { CardExpense } from '../data-access/card-expense.models';
import { CardExpenseService } from '../data-access/card-expense.service';
import { CardExpensesPageComponent } from './card-expenses-page.component';

interface Internals {
    readonly selectedCard: Signal<CreditCard | null>;
    readonly syncResults: Signal<readonly CardSyncResult[] | null>;
    readonly syncing: Signal<'card' | 'all' | null>;
    readonly moveVisible: Signal<boolean>;
    readonly moving: Signal<CardExpense | null>;
    readonly bill: { value: Signal<unknown> };
    readonly rows: Signal<readonly { readonly id: string; readonly personName: string; readonly pending: boolean }[]>;
    readonly pendingCount: Signal<number>;
    readonly onlyPending: Signal<boolean>;
    readonly billStatus: Signal<CreditCardBillSummaryItem | null>;
    togglePendingFilter(): void;
    selectCard(cardId: string | null): void;
    markBillPaid(): void;
    unmarkBillPaid(): void;
    syncCard(): void;
    syncAll(): void;
    afterBillChange(): void;
    afterCreate(month: string): void;
    openMove(expense: CardExpense): void;
}

const NEW_SYNC = aCardSync({ configured: true, status: 'UPDATED', syncedAt: '2026-11-08T15:00:00.000Z' });

const RESULT: CardSyncResult = {
    cardId: 'card-1',
    cardName: 'C6',
    summary: { created: 1, updated: 0, unchanged: 0, removed: 0, replacedManual: 0, ignored: 0 },
    error: null,
    sync: NEW_SYNC,
};

describe('CardExpensesPageComponent (faturas do cartão)', () => {
    const cardExpenses = { findByMonth: vi.fn() };
    const creditCards = {
        findAll: vi.fn(),
        findBill: vi.fn(),
        summarizeBills: vi.fn(),
        markBillPaid: vi.fn(),
        unmarkBillPaid: vi.fn(),
    };
    const cardSync = { syncCard: vi.fn(), syncAll: vi.fn() };
    let notifications: NotificationsMock;

    function render(
        cards: CreditCard[] = [aSyncedCreditCard({ id: 'card-1', name: 'C6' })],
        expenses: CardExpense[] = [aCardExpense({ origin: 'MANUAL' })],
        summaryCards: CreditCardBillSummaryItem[] = [aBillSummaryItem({ cardId: 'card-1', cardName: 'C6' })],
    ) {
        sessionStorage.clear();
        cardExpenses.findByMonth.mockReset().mockReturnValue(of(expenses));
        creditCards.findAll.mockReset().mockReturnValue(of(cards));
        creditCards.findBill.mockReset().mockReturnValue(of(aCardBill({ source: 'bank' })));
        creditCards.summarizeBills
            .mockReset()
            .mockReturnValue(of({ month: '2026-11', total: '1500.00', cards: summaryCards }));
        creditCards.markBillPaid.mockReset();
        creditCards.unmarkBillPaid.mockReset();
        cardSync.syncCard.mockReset();
        cardSync.syncAll.mockReset();
        notifications = notificationsMock();

        const fixture = renderComponent(CardExpensesPageComponent, {}, [
            provideRouter([]),
            { provide: CardExpenseService, useValue: cardExpenses },
            { provide: CreditCardService, useValue: creditCards },
            { provide: CardSyncService, useValue: cardSync },
            { provide: CardImportService, useValue: { findAll: () => of([]) } },
            { provide: CategoryService, useValue: { findAll: () => of([aCategory({ id: 'category-1' })]) } },
            { provide: PersonService, useValue: { findAll: () => of([]) } },
            { provide: NotificationService, useValue: notifications },
            { provide: ConfirmService, useValue: confirmMock() },
        ]);
        const month = TestBed.inject(SelectedMonthService);
        month.set('2026-11');
        TestBed.tick();
        fixture.detectChanges();

        const text = (): string => {
            fixture.detectChanges();

            return (fixture.nativeElement as HTMLElement).textContent ?? '';
        };

        return { page: internals<Internals>(fixture), month, text };
    }

    it('escolhe o primeiro cartão e mostra o período da fatura, a origem e a situação da sincronização', () => {
        const { page, text } = render();

        expect(page.selectedCard()?.id).toBe('card-1');
        expect(cardExpenses.findByMonth).toHaveBeenLastCalledWith('2026-11', 'card-1', false);
        expect(creditCards.findBill).toHaveBeenLastCalledWith('card-1', '2026-11');
        expect(text()).toContain('Compras de 25/09 a 24/10');
        expect(text()).toContain('O banco já informou o fechamento desta fatura.');
        expect(text()).toContain('Atualizar');
        expect(text()).toContain('À mão');
    });

    it('compras sem pessoa: aviso com a quantidade, etiqueta na linha e filtro "só elas"', () => {
        const { page, text } = render(undefined, [
            aCardExpense({ id: 'ce-1', split: 'PENDING' }),
            aCardExpense({ id: 'ce-2' }),
            aCardExpense({ id: 'ce-3', split: 'PENDING', excluded: true }),
        ]);

        expect(page.pendingCount()).toBe(1);
        expect(page.rows().map((row) => [row.id, row.personName, row.pending])).toEqual([
            ['ce-1', 'Sem pessoa', true],
            ['ce-2', 'Compartilhada', false],
            ['ce-3', 'Sem pessoa', false],
        ]);
        expect(text()).toContain('1 compra sem pessoa definida.');

        page.togglePendingFilter();

        expect(page.onlyPending()).toBe(true);
        expect(page.rows().map((row) => row.id)).toEqual(['ce-1']);
        expect(text()).toContain('Mostrar todas');
    });

    it('sem compras pendentes, nem aviso nem filtro', () => {
        const { page, text } = render();

        page.togglePendingFilter();

        expect(page.pendingCount()).toBe(0);
        expect(page.onlyPending()).toBe(false);
        expect(text()).not.toContain('sem pessoa definida');
    });

    it('cartão sem ciclo nem sincronização: não busca a fatura e explica onde configurar', () => {
        const { page, text } = render([aCreditCard({ id: 'card-2' })]);

        expect(page.bill.value()).toBeNull();
        expect(creditCards.findBill).not.toHaveBeenCalled();
        expect(text()).toContain('para ver o período da fatura');
        expect(text()).toContain('Sincronização com o Meu Pluggy desligada');
    });

    it('"Atualizar": mostra o resumo, atualiza a situação do cartão e recarrega as despesas', () => {
        const { page, text } = render();
        cardSync.syncCard.mockReturnValue(of(RESULT));
        const loads = cardExpenses.findByMonth.mock.calls.length;

        page.syncCard();

        expect(cardSync.syncCard).toHaveBeenCalledWith('card-1');
        expect(page.syncResults()).toEqual([RESULT]);
        expect(page.selectedCard()?.sync).toEqual(NEW_SYNC);
        expect(page.syncing()).toBeNull();
        expect(cardExpenses.findByMonth.mock.calls.length).toBe(loads + 1);
        expect(text()).toContain('1 linha criada');
    });

    it('"Atualizar" com erro: o erro aparece no painel e a situação do cartão é recarregada', () => {
        const { page, text } = render();
        cardSync.syncCard.mockReturnValue(apiError(502, 'PLUGGY_UNAVAILABLE', 'A Pluggy não respondeu.'));

        page.syncCard();

        expect(page.syncResults()?.[0]).toMatchObject({
            cardId: 'card-1',
            summary: null,
            error: { code: 'PLUGGY_UNAVAILABLE' },
        });
        expect(creditCards.findAll).toHaveBeenCalledTimes(2);
        expect(text()).toContain('A Pluggy não respondeu.');
        expect(text()).toContain('Enviar fatura');
    });

    it('"Atualizar todos": resultado de cada cartão; falha geral vira aviso', () => {
        const { page } = render();
        const failed: CardSyncResult = {
            ...RESULT,
            cardId: 'card-9',
            summary: null,
            error: { code: 'X', message: 'erro' },
        };
        cardSync.syncAll.mockReturnValue(of([RESULT, failed]));

        page.syncAll();
        expect(page.syncResults()).toEqual([RESULT, failed]);

        cardSync.syncAll.mockReturnValue(apiError(500, 'INTERNAL_ERROR', 'Erro'));
        page.syncAll();
        expect(notifications.error).toHaveBeenCalled();
    });

    it('ajuste do melhor dia: sincroniza quando o cartão sincroniza; senão só recarrega a fatura', () => {
        const synced = render();
        cardSync.syncCard.mockReturnValue(of(RESULT));
        synced.page.afterBillChange();
        expect(cardSync.syncCard).toHaveBeenCalledWith('card-1');

        const manual = render([aCreditCard({ id: 'card-3', dueDay: 5, bestPurchaseDay: 28 })]);
        const billLoads = creditCards.findBill.mock.calls.length;
        manual.page.afterBillChange();
        expect(cardSync.syncCard).not.toHaveBeenCalled();
        expect(creditCards.findBill.mock.calls.length).toBe(billLoads + 1);
    });

    it('depois de "Adicionar compra" em outra fatura, vai até ela', () => {
        const { page, month } = render();

        page.afterCreate('2026-12');

        expect(month.month()).toBe('2026-12');
    });

    it('"Mudar de fatura" pedido pela edição abre o diálogo com a despesa', () => {
        const { page } = render();
        const expense = aCardExpense({ id: 'ce-5', origin: 'SYNC' });

        page.openMove(expense);

        expect(page.moving()).toEqual(expense);
        expect(page.moveVisible()).toBe(true);
    });

    describe('pagamento da fatura', () => {
        it('fatura fechada: situação, vencimento e "Marcar como paga"', () => {
            const { page, text } = render();

            expect(creditCards.summarizeBills).toHaveBeenLastCalledWith('2026-11');
            expect(page.billStatus()?.status).toBe('closed');
            expect(text()).toContain('Fechada · a pagar');
            expect(text()).toContain('Vence 01/11');
            expect(text()).toContain('Marcar como paga');
        });

        it('marcar como paga avisa e recarrega o resumo; erro vira aviso e também recarrega', () => {
            const { page } = render();
            const loads = creditCards.summarizeBills.mock.calls.length;
            creditCards.markBillPaid.mockReturnValue(of(aBillSummaryItem({ status: 'paid' })));

            page.markBillPaid();

            expect(creditCards.markBillPaid).toHaveBeenCalledWith('card-1', '2026-11');
            expect(notifications.success).toHaveBeenCalledWith('Fatura marcada como paga.');
            expect(creditCards.summarizeBills.mock.calls.length).toBe(loads + 1);

            creditCards.markBillPaid.mockReturnValue(apiError(409, 'CREDIT_CARD_BILL_NOT_CLOSED', 'Ainda não fechou.'));
            page.markBillPaid();

            expect(notifications.error).toHaveBeenCalled();
            expect(creditCards.summarizeBills.mock.calls.length).toBe(loads + 2);
        });

        it('paga: data e valor, etiqueta no total e "Desmarcar"', () => {
            const { page, text } = render(undefined, undefined, [
                aBillSummaryItem({
                    cardId: 'card-1',
                    status: 'paid',
                    paidAt: '2026-11-03T15:00:00.000Z',
                    paidAmount: '1500.00',
                }),
            ]);
            creditCards.unmarkBillPaid.mockReturnValue(of(aBillSummaryItem()));

            expect(text()).toMatch(/Paga em \d{2}\/11/);
            expect(text()).toContain('Desmarcar');

            page.unmarkBillPaid();

            expect(creditCards.unmarkBillPaid).toHaveBeenCalledWith('card-1', '2026-11');
            expect(notifications.success).toHaveBeenCalledWith('Pagamento da fatura desmarcado.');
        });

        it('total mudou depois do pagamento: aviso com os dois valores e "Confirmar novo valor"', () => {
            const { text } = render(undefined, undefined, [
                aBillSummaryItem({
                    cardId: 'card-1',
                    status: 'paid',
                    paidAt: '2026-11-03T15:00:00.000Z',
                    paidAmount: '1400.00',
                    total: '1500.00',
                    changedAfterPayment: true,
                }),
            ]);

            expect(text()).toContain('O total mudou depois do pagamento');
            expect(text()).toContain('Confirmar novo valor');
        });

        it('aberta: explica que só dá para marcar depois do fechamento; vencida mostra a etiqueta', () => {
            expect(
                render(undefined, undefined, [aBillSummaryItem({ cardId: 'card-1', status: 'open' })]).text(),
            ).toContain('Dá para marcar como paga depois do fechamento.');
            expect(
                render(undefined, undefined, [aBillSummaryItem({ cardId: 'card-1', status: 'overdue' })]).text(),
            ).toContain('Vencida');
        });

        it('sem cartão na tela não chama o back', () => {
            const { page } = render([]);

            page.markBillPaid();

            expect(page.billStatus()).toBeNull();
            expect(creditCards.markBillPaid).not.toHaveBeenCalled();
        });
    });

    it('resumo das faturas no topo: clicar num cartão mostra as compras dele', () => {
        const { page, text } = render(
            [aSyncedCreditCard({ id: 'card-1', name: 'C6' }), aCreditCard({ id: 'card-2', name: 'Nubank' })],
            undefined,
            [
                aBillSummaryItem({ cardId: 'card-1', cardName: 'C6' }),
                aBillSummaryItem({ cardId: 'card-2', cardName: 'Nubank' }),
            ],
        );

        expect(text()).toContain('Total geral');

        page.selectCard('card-2');
        TestBed.tick();

        expect(page.selectedCard()?.id).toBe('card-2');
        expect(cardExpenses.findByMonth).toHaveBeenLastCalledWith('2026-11', 'card-2', false);
    });
});
