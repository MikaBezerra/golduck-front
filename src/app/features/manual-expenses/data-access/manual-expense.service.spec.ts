import type { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { aManualExpense } from '../../../../testing/fixtures';
import {
    expectApiCall,
    queryOf,
    respondData,
    respondNoContent,
    setupHttpTesting,
} from '../../../../testing/http-testing';
import { ManualExpenseService } from './manual-expense.service';

describe('ManualExpenseService (contrato com /api/manual-expenses)', () => {
    let http: HttpTestingController;
    let service: ManualExpenseService;

    beforeEach(() => {
        http = setupHttpTesting();
        service = TestBed.inject(ManualExpenseService);
    });

    afterEach(() => http.verify());

    it('lista as despesas do mês pela query month', async () => {
        const result = firstValueFrom(service.findByMonth('2026-11'));
        const request = expectApiCall(http, 'GET', 'manual-expenses');

        expect(queryOf(request)).toEqual({ month: '2026-11' });
        respondData(request, [aManualExpense()]);

        await expect(result).resolves.toEqual([aManualExpense()]);
    });

    it('busca uma despesa pelo id', async () => {
        const result = firstValueFrom(service.findById('expense-3'));
        respondData(expectApiCall(http, 'GET', 'manual-expenses/expense-3'), aManualExpense({ id: 'expense-3' }));

        await expect(result).resolves.toMatchObject({ id: 'expense-3' });
    });

    it('cria replicando até dezembro e recebe todas as despesas criadas', async () => {
        const body = {
            month: '2026-11',
            title: 'Internet',
            amount: '99.90',
            categoryId: 'category-1',
            split: 'SHARED' as const,
            replicateUntilYearEnd: true,
        };
        const result = firstValueFrom(service.create(body));
        const request = expectApiCall(http, 'POST', 'manual-expenses');

        expect(request.request.body).toEqual(body);
        respondData(request, [aManualExpense(), aManualExpense({ id: 'expense-2', month: '2026-12' })]);

        await expect(result).resolves.toHaveLength(2);
    });

    it('altera várias de uma vez com { ids, changes }', async () => {
        const body = { ids: ['expense-1', 'expense-2'], changes: { title: 'Internet' } };
        const result = firstValueFrom(service.updateMany(body));
        const request = expectApiCall(http, 'PATCH', 'manual-expenses');

        expect(request.request.body).toEqual(body);
        respondData(request, [aManualExpense({ title: 'Internet' })]);

        await expect(result).resolves.toHaveLength(1);
    });

    it('apaga várias com DELETE e { ids } no corpo', async () => {
        const result = firstValueFrom(service.deleteMany(['expense-1', 'expense-2']));
        const request = expectApiCall(http, 'DELETE', 'manual-expenses');

        expect(request.request.body).toEqual({ ids: ['expense-1', 'expense-2'] });
        respondNoContent(request);

        await expect(result).resolves.toBeUndefined();
    });

    it('marca ou desmarca como pagas com PATCH { ids, changes: { paid } }', async () => {
        const result = firstValueFrom(service.setPaid(['expense-1'], true));
        const request = expectApiCall(http, 'PATCH', 'manual-expenses');

        expect(request.request.body).toEqual({ ids: ['expense-1'], changes: { paid: true } });
        respondData(request, [aManualExpense({ paidAt: '2026-11-08T12:00:00.000Z' })]);

        await expect(result).resolves.toEqual([expect.objectContaining({ paidAt: '2026-11-08T12:00:00.000Z' })]);
    });

    it('resumo do mês com GET /manual-expenses/summary?month', async () => {
        const summary = { month: '2026-11', total: '10.00', paid: '0.00', unpaid: '10.00', count: 1, categories: [] };
        const result = firstValueFrom(service.summarize('2026-11'));
        const request = expectApiCall(http, 'GET', 'manual-expenses/summary');

        expect(request.request.params.get('month')).toBe('2026-11');
        respondData(request, summary);

        await expect(result).resolves.toEqual(summary);
    });
});
