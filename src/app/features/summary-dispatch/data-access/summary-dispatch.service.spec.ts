import type { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { expectApiCall, queryOf, respondData, setupHttpTesting } from '../../../../testing/http-testing';
import { SummaryDispatchService } from './summary-dispatch.service';

describe('SummaryDispatchService (contrato com /api/summary/dispatches)', () => {
    let http: HttpTestingController;
    let service: SummaryDispatchService;

    beforeEach(() => {
        http = setupHttpTesting();
        service = TestBed.inject(SummaryDispatchService);
    });

    afterEach(() => http.verify());

    it('busca a prévia do envio pela query month', async () => {
        const preview = { month: '2026-11', enabled: true, recipients: [], lastDispatch: null };
        const result = firstValueFrom(service.preview('2026-11'));
        const request = expectApiCall(http, 'GET', 'summary/dispatches/preview');

        expect(queryOf(request)).toEqual({ month: '2026-11' });
        respondData(request, preview);

        await expect(result).resolves.toEqual(preview);
    });

    it('envia o mês com a Idempotency-Key no header', async () => {
        const result = firstValueFrom(service.dispatch('2026-11', 'chave-1'));
        const request = expectApiCall(http, 'POST', 'summary/dispatches');

        expect(request.request.body).toEqual({ month: '2026-11' });
        expect(request.request.headers.get('Idempotency-Key')).toBe('chave-1');
        respondData(request, { id: 'd1' });

        await expect(result).resolves.toEqual({ id: 'd1' });
    });

    it('reenvia só para as pessoas informadas em personIds', async () => {
        const result = firstValueFrom(service.dispatch('2026-11', 'chave-2', ['p1', 'p2']));
        const request = expectApiCall(http, 'POST', 'summary/dispatches');

        expect(request.request.body).toEqual({ month: '2026-11', personIds: ['p1', 'p2'] });
        expect(request.request.headers.get('Idempotency-Key')).toBe('chave-2');
        respondData(request, { id: 'd2' });

        await expect(result).resolves.toEqual({ id: 'd2' });
    });

    it('busca o e-mail de uma pessoa pela query month e personId', async () => {
        const email = { personId: 'p1', recipient: null, subject: 'Assunto', html: '<p>Oi</p>', text: 'Oi' };
        const result = firstValueFrom(service.email('2026-11', 'p1'));
        const request = expectApiCall(http, 'GET', 'summary/dispatches/email');

        expect(queryOf(request)).toEqual({ month: '2026-11', personId: 'p1' });
        respondData(request, email);

        await expect(result).resolves.toEqual(email);
    });
});
