import { inject, Injectable } from '@angular/core';
import { catchError, map, type Observable, of, throwError } from 'rxjs';

import { ApiError } from '../../../core/api/api-error';
import { ApiService } from '../../../core/api/api.service';
import type { CreateReserveRequest, Reserve, ReserveList, UpdateReserveRequest } from './reserve.models';

/** Chamadas HTTP de `/reserves` (mesmo formato de `/incomes`; ver reserve.models.ts). */
@Injectable({ providedIn: 'root' })
export class ReserveService {
    private readonly api = inject(ApiService);

    /**
     * Reservas do ano, em ordem de mês. A lista nunca dá 404 quando o endpoint existe;
     * um 404 aqui significa que o back ainda não tem o módulo (aí devolve `available: false`).
     */
    public findByYear(year: number): Observable<ReserveList> {
        return this.api.get<Reserve[]>('reserves', { year }).pipe(
            map((items): ReserveList => ({ available: true, items })),
            catchError((error: unknown) =>
                ApiError.from(error).status === 404
                    ? of<ReserveList>({ available: false, items: [] })
                    : throwError(() => error),
            ),
        );
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
