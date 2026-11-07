import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import type { CreateManualExpenseRequest, ManualExpense, UpdateManualExpensesRequest } from './manual-expense.models';

/** Chamadas HTTP de `/manual-expenses` (ver financas/src/modules/manual-expenses/controller). */
@Injectable({ providedIn: 'root' })
export class ManualExpenseService {
    private readonly api = inject(ApiService);

    /** Despesas de um mês, em ordem alfabética de título. */
    public findByMonth(month: string): Observable<ManualExpense[]> {
        return this.api.get<ManualExpense[]>('manual-expenses', { month });
    }

    public findById(id: string): Observable<ManualExpense> {
        return this.api.get<ManualExpense>(`manual-expenses/${id}`);
    }

    /** Devolve todas as despesas criadas (mais de uma quando replica até dezembro). */
    public create(body: CreateManualExpenseRequest): Observable<ManualExpense[]> {
        return this.api.post<ManualExpense[]>('manual-expenses', body);
    }

    public updateMany(body: UpdateManualExpensesRequest): Observable<ManualExpense[]> {
        return this.api.patch<ManualExpense[]>('manual-expenses', body);
    }

    public deleteMany(ids: string[]): Observable<void> {
        return this.api.delete('manual-expenses', { ids });
    }
}
