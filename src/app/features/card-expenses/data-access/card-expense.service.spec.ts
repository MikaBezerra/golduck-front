import type { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { aCardExpense } from '../../../../testing/fixtures';
import {
    expectApiCall,
    queryOf,
    respondData,
    respondNoContent,
    setupHttpTesting,
} from '../../../../testing/http-testing';
import { CardExpenseService } from './card-expense.service';

describe('CardExpenseService (contrato com /api/card-expenses)', () => {
    let http: HttpTestingController;
    let service: CardExpenseService;

    beforeEach(() => {
        http = setupHttpTesting();
        service = TestBed.inject(CardExpenseService);
    });

    afterEach(() => http.verify());

    it('lista as despesas do cartão no mês, sem as excluídas por padrão', async () => {
        const result = firstValueFrom(service.findByMonth('2026-11', 'card-1'));
        const request = expectApiCall(http, 'GET', 'card-expenses');

        expect(queryOf(request)).toEqual({ month: '2026-11', cardId: 'card-1' });
        respondData(request, [aCardExpense()]);

        await expect(result).resolves.toEqual([aCardExpense()]);
    });

    it('pede as excluídas com includeExcluded=true', async () => {
        const result = firstValueFrom(service.findByMonth('2026-11', 'card-1', true));
        const request = expectApiCall(http, 'GET', 'card-expenses');

        expect(queryOf(request)).toEqual({ month: '2026-11', cardId: 'card-1', includeExcluded: 'true' });
        respondData(request, [aCardExpense({ excluded: true })]);

        await expect(result).resolves.toHaveLength(1);
    });

    it('lista o mês de todos os cartões só com a query month', async () => {
        const result = firstValueFrom(service.findByMonthAllCards('2026-11'));
        const request = expectApiCall(http, 'GET', 'card-expenses');

        expect(queryOf(request)).toEqual({ month: '2026-11' });
        respondData(request, []);

        await expect(result).resolves.toEqual([]);
    });

    it('busca pelo id e altera várias com { ids, changes }', async () => {
        const found = firstValueFrom(service.findById('card-expense-9'));
        respondData(expectApiCall(http, 'GET', 'card-expenses/card-expense-9'), aCardExpense({ id: 'card-expense-9' }));
        await expect(found).resolves.toMatchObject({ id: 'card-expense-9' });

        const body = { ids: ['card-expense-1'], changes: { nickname: 'Feira', personId: 'person-1' } };
        const updated = firstValueFrom(service.updateMany(body));
        const request = expectApiCall(http, 'PATCH', 'card-expenses');
        expect(request.request.body).toEqual(body);
        respondData(request, [aCardExpense({ nickname: 'Feira', personId: 'person-1' })]);
        await expect(updated).resolves.toHaveLength(1);
    });

    it('exclui com DELETE e restaura com POST /restore, sempre com { ids, scope }', async () => {
        const body = { ids: ['card-expense-1'], scope: 'forward' as const };

        const excluded = firstValueFrom(service.exclude(body));
        const excludeRequest = expectApiCall(http, 'DELETE', 'card-expenses');
        expect(excludeRequest.request.body).toEqual(body);
        respondNoContent(excludeRequest);
        await expect(excluded).resolves.toBeUndefined();

        const restored = firstValueFrom(service.restore({ ids: ['card-expense-1'], scope: 'all' }));
        const restoreRequest = expectApiCall(http, 'POST', 'card-expenses/restore');
        expect(restoreRequest.request.body).toEqual({ ids: ['card-expense-1'], scope: 'all' });
        respondData(restoreRequest, [aCardExpense()]);
        await expect(restored).resolves.toHaveLength(1);
    });
});
