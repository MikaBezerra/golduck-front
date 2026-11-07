import type { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { aCreditCard } from '../../../../testing/fixtures';
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
});
