import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import type { CardSyncResult } from './card-sync.models';

/** Chamadas HTTP da sincronização com o Meu Pluggy (ver `card-sync/controller` no back). */
@Injectable({ providedIn: 'root' })
export class CardSyncService {
    private readonly api = inject(ApiService);

    /**
     * Botão "Atualizar" de um cartão. Uma falha (Pluggy fora do ar, cartão sem configuração...)
     * chega como erro da requisição; o cartão guarda a mensagem em `sync.error`.
     */
    public syncCard(cardId: string): Observable<CardSyncResult> {
        return this.api.post<CardSyncResult>(`credit-cards/${cardId}/sync`);
    }

    /** Todos os cartões configurados. Responde 200 mesmo se algum falhar: o erro vem no resultado dele. */
    public syncAll(): Observable<CardSyncResult[]> {
        return this.api.post<CardSyncResult[]>('card-sync');
    }
}
