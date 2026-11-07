import type { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { anIncome } from '../../../../testing/fixtures';
import {
    expectApiCall,
    queryOf,
    respondData,
    respondNoContent,
    setupHttpTesting,
} from '../../../../testing/http-testing';
import { IncomeService } from './income.service';

describe('IncomeService (contrato com /api/incomes)', () => {
    let http: HttpTestingController;
    let service: IncomeService;

    beforeEach(() => {
        http = setupHttpTesting();
        service = TestBed.inject(IncomeService);
    });

    afterEach(() => http.verify());

    it('lista as entradas do ano pela query year', async () => {
        const result = firstValueFrom(service.findByYear(2026));
        const request = expectApiCall(http, 'GET', 'incomes');

        expect(queryOf(request)).toEqual({ year: '2026' });
        respondData(request, [anIncome()]);

        await expect(result).resolves.toEqual([anIncome()]);
    });

    it('busca, altera e apaga pelo mês no caminho (AAAA-MM)', async () => {
        const found = firstValueFrom(service.findByMonth('2026-11'));
        respondData(expectApiCall(http, 'GET', 'incomes/2026-11'), anIncome());
        await expect(found).resolves.toMatchObject({ month: '2026-11' });

        const updated = firstValueFrom(service.update('2026-11', { amount: '6000.00' }));
        const updateRequest = expectApiCall(http, 'PATCH', 'incomes/2026-11');
        expect(updateRequest.request.body).toEqual({ amount: '6000.00' });
        respondData(updateRequest, anIncome({ amount: '6000.00' }));
        await expect(updated).resolves.toMatchObject({ amount: '6000.00' });

        const deleted = firstValueFrom(service.delete('2026-11'));
        respondNoContent(expectApiCall(http, 'DELETE', 'incomes/2026-11'));
        await expect(deleted).resolves.toBeUndefined();
    });

    it('cria em vários meses de uma vez e devolve todas as entradas criadas', async () => {
        const body = { year: 2026, months: [11, 12], amount: '5000.00' };
        const result = firstValueFrom(service.create(body));
        const request = expectApiCall(http, 'POST', 'incomes');

        expect(request.request.body).toEqual(body);
        respondData(request, [anIncome(), anIncome({ id: 'income-2', month: '2026-12' })]);

        await expect(result).resolves.toHaveLength(2);
    });
});
