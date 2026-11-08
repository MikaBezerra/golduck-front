import type { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { expectApiCall, queryOf, respondData, setupHttpTesting } from '../../../../testing/http-testing';
import { SummaryService } from './summary.service';

describe('SummaryService (contrato com /api/summary)', () => {
    let http: HttpTestingController;
    let service: SummaryService;

    beforeEach(() => {
        http = setupHttpTesting();
        service = TestBed.inject(SummaryService);
    });

    afterEach(() => http.verify());

    it('busca o resumo do mês pela query month e devolve como veio', async () => {
        const summary = { month: '2026-11', income: '5000.00', balance: '1200.00' };
        const result = firstValueFrom(service.findByMonth('2026-11'));
        const request = expectApiCall(http, 'GET', 'summary');

        expect(queryOf(request)).toEqual({ month: '2026-11' });
        respondData(request, summary);

        await expect(result).resolves.toEqual(summary);
    });

    it('busca a tabela do resumo do mês em /summary/statement pela query month e devolve como veio', async () => {
        const statement = { month: '2026-11', columns: [], sections: [], hasPeople: false, incomeMissing: true };
        const result = firstValueFrom(service.findStatement('2026-11'));
        const request = expectApiCall(http, 'GET', 'summary/statement');

        expect(queryOf(request)).toEqual({ month: '2026-11' });
        respondData(request, statement);

        await expect(result).resolves.toEqual(statement);
    });

    it('busca o resumo do ano em /summary/annual pela query year', async () => {
        const annual = { year: 2026, months: [] };
        const result = firstValueFrom(service.findByYear(2026));
        const request = expectApiCall(http, 'GET', 'summary/annual');

        expect(queryOf(request)).toEqual({ year: '2026' });
        respondData(request, annual);

        await expect(result).resolves.toEqual(annual);
    });
});
