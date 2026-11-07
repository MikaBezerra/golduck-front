import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import type { AnnualSummary, Summary } from './summary.models';

/** Chamadas HTTP de `/summary` (ver financas/src/modules/summary/controller). */
@Injectable({ providedIn: 'root' })
export class SummaryService {
    private readonly api = inject(ApiService);

    /** Entrada, despesas, saldo, totais por categoria e por pessoa e o líquido de cada pessoa no mês. */
    public findByMonth(month: string): Observable<Summary> {
        return this.api.get<Summary>('summary', { month });
    }

    /** Os totais do ano inteiro e a lista dos 12 meses (para o gráfico). */
    public findByYear(year: number): Observable<AnnualSummary> {
        return this.api.get<AnnualSummary>('summary/annual', { year });
    }
}
