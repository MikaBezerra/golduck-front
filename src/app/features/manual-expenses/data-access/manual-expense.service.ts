import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import type {
    CreateManualExpenseRequest,
    ManualExpense,
    ManualExpensesSummary,
    UpdateManualExpensesRequest,
} from './manual-expense.models';

/** Chamadas HTTP de `/manual-expenses` (ver `manual-expenses/controller` no back). */
@Injectable({ providedIn: 'root' })
export class ManualExpenseService {
    private readonly api = inject(ApiService);

    /** Despesas de um mês, em ordem alfabética de título. */
    public findByMonth(month: string): Observable<ManualExpense[]> {
        return this.api.get<ManualExpense[]>('manual-expenses', { month });
    }

    /** Total, pago, a pagar e total por categoria do mês. */
    public summarize(month: string): Observable<ManualExpensesSummary> {
        return this.api.get<ManualExpensesSummary>('manual-expenses/summary', { month });
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

    /** Marca (ou desmarca) as despesas como pagas; devolve as despesas alteradas. */
    public setPaid(ids: string[], paid: boolean): Observable<ManualExpense[]> {
        return this.updateMany({ ids, changes: { paid } });
    }

    public deleteMany(ids: string[]): Observable<void> {
        return this.api.delete('manual-expenses', { ids });
    }
}
