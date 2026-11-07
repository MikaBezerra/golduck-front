import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import type { CardExpense, UpdateCardExpensesRequest } from './card-expense.models';

/** Chamadas HTTP de `/card-expenses` (ver financas/src/modules/card-expenses/controller). */
@Injectable({ providedIn: 'root' })
export class CardExpenseService {
    private readonly api = inject(ApiService);

    /** Despesas do cartão no mês, em ordem de data. */
    public findByMonth(month: string, cardId: string): Observable<CardExpense[]> {
        return this.api.get<CardExpense[]>('card-expenses', { month, cardId });
    }

    public findById(id: string): Observable<CardExpense> {
        return this.api.get<CardExpense>(`card-expenses/${id}`);
    }

    /** Devolve todas as linhas alteradas, inclusive as parcelas seguintes. */
    public updateMany(body: UpdateCardExpensesRequest): Observable<CardExpense[]> {
        return this.api.patch<CardExpense[]>('card-expenses', body);
    }
}
