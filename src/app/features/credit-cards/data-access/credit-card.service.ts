import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import type {
    CreateCreditCardRequest,
    CreditCard,
    CreditCardBill,
    UpdateCreditCardBillRequest,
    UpdateCreditCardRequest,
} from './credit-card.models';

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

    /**
     * Ciclo de uma fatura (início, fechamento, melhor dia, vencimento e de onde veio).
     * O cartão precisa de vencimento e melhor dia (`409 CREDIT_CARD_BILLING_NOT_CONFIGURED`).
     */
    public findBill(id: string, month: string): Observable<CreditCardBill | null> {
        return this.api
            .get<CreditCardBill[]>(`credit-cards/${id}/bills`, { from: month, to: month })
            .pipe(map((bills) => bills.find((bill) => bill.month === month) ?? null));
    }

    /** Ajusta o melhor dia de compra de uma fatura (`null` volta ao padrão do cartão). */
    public updateBill(id: string, month: string, body: UpdateCreditCardBillRequest): Observable<CreditCardBill> {
        return this.api.put<CreditCardBill>(`credit-cards/${id}/bills/${month}`, body);
    }
}
