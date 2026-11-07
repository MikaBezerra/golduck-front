import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import type { CardExpense, CardExpenseScopeRequest, UpdateCardExpensesRequest } from './card-expense.models';

/** Chamadas HTTP de `/card-expenses` (ver `card-expenses/controller` no back). */
@Injectable({ providedIn: 'root' })
export class CardExpenseService {
    private readonly api = inject(ApiService);

    /** Despesas do cartão no mês, em ordem de data. As excluídas só vêm com `includeExcluded`. */
    public findByMonth(month: string, cardId: string, includeExcluded = false): Observable<CardExpense[]> {
        return this.api.get<CardExpense[]>('card-expenses', {
            month,
            cardId,
            ...(includeExcluded ? { includeExcluded } : {}),
        });
    }

    /** Despesas de todos os cartões no mês (sem as excluídas), para o resumo. */
    public findByMonthAllCards(month: string): Observable<CardExpense[]> {
        return this.api.get<CardExpense[]>('card-expenses', { month });
    }

    public findById(id: string): Observable<CardExpense> {
        return this.api.get<CardExpense>(`card-expenses/${id}`);
    }

    /** Devolve todas as linhas alteradas, inclusive as parcelas seguintes. */
    public updateMany(body: UpdateCardExpensesRequest): Observable<CardExpense[]> {
        return this.api.patch<CardExpense[]>('card-expenses', body);
    }

    /**
     * Exclusão suave: a despesa sai das listas e dos totais, e os próximos envios de
     * fatura a mantêm excluída. Em compras parceladas, `scope` define as parcelas.
     */
    public exclude(body: CardExpenseScopeRequest): Observable<void> {
        return this.api.delete('card-expenses', body);
    }

    /** Desfaz a exclusão no escopo pedido; devolve as linhas restauradas. */
    public restore(body: CardExpenseScopeRequest): Observable<CardExpense[]> {
        return this.api.post<CardExpense[]>('card-expenses/restore', body);
    }
}
