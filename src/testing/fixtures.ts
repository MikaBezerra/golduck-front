import type { CardExpense } from '../app/features/card-expenses/data-access/card-expense.models';
import type { Category } from '../app/features/categories/data-access/category.models';
import type {
    CreditCard,
    CreditCardBill,
    CreditCardBillStatus,
    CreditCardBillSummaryItem,
    CreditCardSync,
} from '../app/features/credit-cards/data-access/credit-card.models';
import type { Income } from '../app/features/incomes/data-access/income.models';
import type { ManualExpense } from '../app/features/manual-expenses/data-access/manual-expense.models';
import type { Person } from '../app/features/people/data-access/person.models';
import type { Reserve } from '../app/features/reserves/data-access/reserve.models';

/*
 * Registros de exemplo no formato que a API devolve. Cada função aceita só o que o teste quer
 * destacar; o resto vem preenchido.
 */

const TIMESTAMP = '2026-11-01T12:00:00.000Z';

export function aPerson(overrides: Partial<Person> = {}): Person {
    return {
        id: 'person-1',
        name: 'Ana',
        email: null,
        phone: null,
        active: true,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
        ...overrides,
    };
}

export function aCategory(overrides: Partial<Category> = {}): Category {
    return {
        id: 'category-1',
        name: 'Mercado',
        active: true,
        isDefault: false,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
        ...overrides,
    };
}

export function aCreditCard(overrides: Partial<CreditCard> = {}): CreditCard {
    return {
        id: 'card-1',
        name: 'Nubank roxinho',
        bank: 'NUBANK',
        active: true,
        dueDay: null,
        bestPurchaseDay: null,
        pluggyItemId: null,
        syncFromMonth: null,
        creditLimit: null,
        sync: aCardSync(),
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
        ...overrides,
    };
}

export function aCardSync(overrides: Partial<CreditCardSync> = {}): CreditCardSync {
    return {
        configured: false,
        syncedAt: null,
        dataUpdatedAt: null,
        status: null,
        error: null,
        consentExpiresAt: null,
        ...overrides,
    };
}

/** Cartão com o ciclo da fatura e a sincronização configurados. */
export function aSyncedCreditCard(overrides: Partial<CreditCard> = {}): CreditCard {
    return aCreditCard({
        dueDay: 1,
        bestPurchaseDay: 25,
        pluggyItemId: '11111111-2222-4333-8444-555555555555',
        syncFromMonth: '2026-11',
        sync: aCardSync({ configured: true, status: 'UPDATED', dataUpdatedAt: TIMESTAMP, syncedAt: TIMESTAMP }),
        ...overrides,
    });
}

export function aCardBill(overrides: Partial<CreditCardBill> = {}): CreditCardBill {
    return {
        month: '2026-11',
        startDate: '2026-09-25',
        closingDate: '2026-10-24',
        bestPurchaseDate: '2026-10-25',
        dueDate: '2026-11-01',
        source: 'default',
        userBestPurchaseDate: null,
        ...overrides,
    };
}

/** Situação de uma fatura (`PUT /credit-cards/{id}/bills/{month}/payment`): fechada e a pagar. */
export function aBillStatus(overrides: Partial<CreditCardBillStatus> = {}): CreditCardBillStatus {
    return {
        cardId: 'card-1',
        month: '2026-11',
        status: 'closed',
        total: '1500.00',
        closingDate: '2026-10-24',
        dueDate: '2026-11-01',
        paidAt: null,
        paidAmount: null,
        changedAfterPayment: false,
        ...overrides,
    };
}

/** Um cartão no resumo das faturas do mês (`GET /credit-cards/bills/summary`). */
export function aBillSummaryItem(overrides: Partial<CreditCardBillSummaryItem> = {}): CreditCardBillSummaryItem {
    return {
        ...aBillStatus(),
        cardName: 'Nubank roxinho',
        bank: 'NUBANK',
        active: true,
        creditLimit: null,
        availableLimit: null,
        ...overrides,
    };
}

export function anIncome(overrides: Partial<Income> = {}): Income {
    return {
        id: 'income-1',
        month: '2026-11',
        amount: '5000.00',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
        ...overrides,
    };
}

export function aReserve(overrides: Partial<Reserve> = {}): Reserve {
    return {
        id: 'reserve-1',
        month: '2026-11',
        amount: '500.00',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
        ...overrides,
    };
}

export function aManualExpense(overrides: Partial<ManualExpense> = {}): ManualExpense {
    return {
        id: 'expense-1',
        month: '2026-11',
        title: 'Aluguel',
        amount: '1500.00',
        categoryId: 'category-1',
        personId: null,
        // Com pessoa, individual; sem, compartilhada (passe split: 'PENDING' para uma compra sem pessoa).
        split: overrides.personId ? 'PERSONAL' : 'SHARED',
        paidAt: null,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
        ...overrides,
    };
}

export function aCardExpense(overrides: Partial<CardExpense> = {}): CardExpense {
    return {
        id: 'card-expense-1',
        cardId: 'card-1',
        importId: 'import-1',
        origin: 'UPLOAD',
        month: '2026-11',
        transactionDate: '2026-10-15',
        description: 'Mercado',
        originalDescription: 'SUPERMERCADO XYZ',
        nickname: null,
        holderName: null,
        cardLastDigits: null,
        amount: '120.50',
        installment: null,
        categoryId: 'category-1',
        personId: null,
        // Com pessoa, individual; sem, compartilhada (passe split: 'PENDING' para uma compra sem pessoa).
        split: overrides.personId ? 'PERSONAL' : 'SHARED',
        excluded: false,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
        ...overrides,
    };
}
