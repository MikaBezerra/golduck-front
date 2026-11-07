import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import type { CreateReserveRequest, Reserve, ReserveTotals, UpdateReserveRequest } from './reserve.models';

/** Chamadas HTTP de `/reserves` (ver financas/src/modules/reserves/controller). */
@Injectable({ providedIn: 'root' })
export class ReserveService {
    private readonly api = inject(ApiService);

    /** Reservas do ano, em ordem de mês. */
    public findByYear(year: number): Observable<Reserve[]> {
        return this.api.get<Reserve[]>('reserves', { year });
    }

    /** Quanto já foi guardado no total e em cada ano. */
    public totals(): Observable<ReserveTotals> {
        return this.api.get<ReserveTotals>('reserves/totals');
    }

    public create(body: CreateReserveRequest): Observable<Reserve[]> {
        return this.api.post<Reserve[]>('reserves', body);
    }

    public update(month: string, body: UpdateReserveRequest): Observable<Reserve> {
        return this.api.patch<Reserve>(`reserves/${month}`, body);
    }

    public delete(month: string): Observable<void> {
        return this.api.delete(`reserves/${month}`);
    }
}
