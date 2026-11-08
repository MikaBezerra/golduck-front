import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import {
    IDEMPOTENCY_KEY_HEADER,
    type SummaryDispatch,
    type SummaryDispatchPreview,
    type SummaryEmailPreview,
} from './summary-dispatch.models';

/** Chamadas HTTP de `/summary/dispatches` (ver `summary-dispatch/controller` no back). Só ADMIN. */
@Injectable({ providedIn: 'root' })
export class SummaryDispatchService {
    private readonly api = inject(ApiService);

    /** Quem vai receber o resumo do mês, se o envio está ligado e o último envio. */
    public preview(month: string): Observable<SummaryDispatchPreview> {
        return this.api.get<SummaryDispatchPreview>('summary/dispatches/preview', { month });
    }

    /**
     * Envia o resumo do mês por e-mail (todas as pessoas ativas, ou só `personIds`).
     * `idempotencyKey` é um UUID por intenção de envio: repetir com a mesma chave devolve o
     * resultado gravado, sem enviar de novo.
     */
    public dispatch(month: string, idempotencyKey: string, personIds?: readonly string[]): Observable<SummaryDispatch> {
        const body = personIds ? { month, personIds } : { month };

        return this.api.post<SummaryDispatch>('summary/dispatches', body, {
            headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
        });
    }

    /** O e-mail de uma pessoa (assunto, HTML e texto) como ela vai receber, sem enviar. */
    public email(month: string, personId: string): Observable<SummaryEmailPreview> {
        return this.api.get<SummaryEmailPreview>('summary/dispatches/email', { month, personId });
    }
}
