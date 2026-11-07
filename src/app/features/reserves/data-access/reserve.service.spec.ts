import type { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { aReserve } from '../../../../testing/fixtures';
import {
    expectApiCall,
    queryOf,
    respondData,
    respondNoContent,
    setupHttpTesting,
} from '../../../../testing/http-testing';
import { ReserveService } from './reserve.service';

describe('ReserveService (contrato com /api/reserves)', () => {
    let http: HttpTestingController;
    let service: ReserveService;

    beforeEach(() => {
        http = setupHttpTesting();
        service = TestBed.inject(ReserveService);
    });

    afterEach(() => http.verify());

    it('lista as reservas do ano pela query year', async () => {
        const result = firstValueFrom(service.findByYear(2026));
        const request = expectApiCall(http, 'GET', 'reserves');

        expect(queryOf(request)).toEqual({ year: '2026' });
        respondData(request, [aReserve()]);

        await expect(result).resolves.toEqual([aReserve()]);
    });

    it('busca os totais guardados em /reserves/totals', async () => {
        const totals = { total: '1500.00', count: 3, byYear: [{ year: 2026, amount: '1500.00', count: 3 }] };
        const result = firstValueFrom(service.totals());
        respondData(expectApiCall(http, 'GET', 'reserves/totals'), totals);

        await expect(result).resolves.toEqual(totals);
    });

    it('cria, altera e apaga nas rotas certas', async () => {
        const created = firstValueFrom(service.create({ year: 2026, months: [11], amount: '500.00' }));
        const createRequest = expectApiCall(http, 'POST', 'reserves');
        expect(createRequest.request.body).toEqual({ year: 2026, months: [11], amount: '500.00' });
        respondData(createRequest, [aReserve()]);
        await expect(created).resolves.toHaveLength(1);

        const updated = firstValueFrom(service.update('2026-11', { amount: '700.00' }));
        const updateRequest = expectApiCall(http, 'PATCH', 'reserves/2026-11');
        expect(updateRequest.request.body).toEqual({ amount: '700.00' });
        respondData(updateRequest, aReserve({ amount: '700.00' }));
        await expect(updated).resolves.toMatchObject({ amount: '700.00' });

        const deleted = firstValueFrom(service.delete('2026-11'));
        respondNoContent(expectApiCall(http, 'DELETE', 'reserves/2026-11'));
        await expect(deleted).resolves.toBeUndefined();
    });
});
