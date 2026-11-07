import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import type { CreateIncomeRequest, Income, UpdateIncomeRequest } from './income.models';

/** Chamadas HTTP de `/incomes` (ver `incomes/controller` no back). */
@Injectable({ providedIn: 'root' })
export class IncomeService {
    private readonly api = inject(ApiService);

    /** Entradas do ano, em ordem de mês. */
    public findByYear(year: number): Observable<Income[]> {
        return this.api.get<Income[]>('incomes', { year });
    }

    public findByMonth(month: string): Observable<Income> {
        return this.api.get<Income>(`incomes/${month}`);
    }

    public create(body: CreateIncomeRequest): Observable<Income[]> {
        return this.api.post<Income[]>('incomes', body);
    }

    public update(month: string, body: UpdateIncomeRequest): Observable<Income> {
        return this.api.patch<Income>(`incomes/${month}`, body);
    }

    public delete(month: string): Observable<void> {
        return this.api.delete(`incomes/${month}`);
    }
}
