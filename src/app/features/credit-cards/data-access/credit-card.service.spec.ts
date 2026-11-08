import type { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { aCardBill, aCreditCard } from '../../../../testing/fixtures';
import { expectApiCall, queryOf, respondData, setupHttpTesting } from '../../../../testing/http-testing';
import { CreditCardService } from './credit-card.service';

describe('CreditCardService (contrato com /api/credit-cards)', () => {
    let http: HttpTestingController;
    let service: CreditCardService;

    beforeEach(() => {
        http = setupHttpTesting();
        service = TestBed.inject(CreditCardService);
    });

    afterEach(() => http.verify());

    it('lista os cartões ativos sem query', async () => {
        const result = firstValueFrom(service.findAll());
        const request = expectApiCall(http, 'GET', 'credit-cards');

        expect(queryOf(request)).toEqual({});
        respondData(request, [aCreditCard()]);

        await expect(result).resolves.toEqual([aCreditCard()]);
    });

    it('busca pelo id (inclusive inativo)', async () => {
        const result = firstValueFrom(service.findById('card-7'));
        respondData(expectApiCall(http, 'GET', 'credit-cards/card-7'), aCreditCard({ id: 'card-7', active: false }));

        await expect(result).resolves.toMatchObject({ id: 'card-7', active: false });
    });

    it('cria com nome e banco e altera com PATCH', async () => {
        const created = firstValueFrom(service.create({ name: 'C6 preto', bank: 'C6' }));
        const createRequest = expectApiCall(http, 'POST', 'credit-cards');
        expect(createRequest.request.body).toEqual({ name: 'C6 preto', bank: 'C6' });
        respondData(createRequest, aCreditCard({ name: 'C6 preto', bank: 'C6' }));
        await expect(created).resolves.toMatchObject({ bank: 'C6' });

        const updated = firstValueFrom(service.update('card-1', { active: false }));
        const updateRequest = expectApiCall(http, 'PATCH', 'credit-cards/card-1');
        expect(updateRequest.request.body).toEqual({ active: false });
        respondData(updateRequest, aCreditCard({ active: false }));
        await expect(updated).resolves.toMatchObject({ active: false });
    });

    it('busca o ciclo de uma fatura com from=to=mês e devolve a fatura do mês', async () => {
        const result = firstValueFrom(service.findBill('card-1', '2026-11'));
        const request = expectApiCall(http, 'GET', 'credit-cards/card-1/bills');

        expect(queryOf(request)).toEqual({ from: '2026-11', to: '2026-11' });
        respondData(request, [aCardBill({ month: '2026-11', source: 'bank' })]);

        await expect(result).resolves.toMatchObject({ month: '2026-11', source: 'bank' });
    });

    it('sem a fatura do mês na resposta, devolve null', async () => {
        const result = firstValueFrom(service.findBill('card-1', '2026-11'));
        respondData(expectApiCall(http, 'GET', 'credit-cards/card-1/bills'), []);

        await expect(result).resolves.toBeNull();
    });

    it('ajusta o melhor dia da fatura com PUT (null volta ao padrão)', async () => {
        const result = firstValueFrom(service.updateBill('card-1', '2026-11', { bestPurchaseDate: null }));
        const request = expectApiCall(http, 'PUT', 'credit-cards/card-1/bills/2026-11');

        expect(request.request.body).toEqual({ bestPurchaseDate: null });
        respondData(request, aCardBill());

        await expect(result).resolves.toMatchObject({ month: '2026-11' });
    });
});
