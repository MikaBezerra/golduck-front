import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import type { CreateCreditCardRequest, CreditCard, UpdateCreditCardRequest } from './credit-card.models';

/** Chamadas HTTP de `/credit-cards` (ver `credit-cards/controller` no back). */
@Injectable({ providedIn: 'root' })
export class CreditCardService {
    private readonly api = inject(ApiService);

    /** Somente cartões ativos, em ordem alfabética. */
    public findAll(): Observable<CreditCard[]> {
        return this.api.get<CreditCard[]>('credit-cards');
    }

    /** Busca qualquer cartão, inclusive inativo. */
    public findById(id: string): Observable<CreditCard> {
        return this.api.get<CreditCard>(`credit-cards/${id}`);
    }

    public create(body: CreateCreditCardRequest): Observable<CreditCard> {
        return this.api.post<CreditCard>('credit-cards', body);
    }

    public update(id: string, body: UpdateCreditCardRequest): Observable<CreditCard> {
        return this.api.patch<CreditCard>(`credit-cards/${id}`, body);
    }
}
