import type { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { aBillStatus, aBillSummaryItem, aCardBill, aCreditCard } from '../../../../testing/fixtures';
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

    it('resumo das faturas do mês com GET ?month', async () => {
        const summary = { month: '2026-11', total: '1500.00', cards: [aBillSummaryItem()] };
        const result = firstValueFrom(service.summarizeBills('2026-11'));
        const request = expectApiCall(http, 'GET', 'credit-cards/bills/summary');

        expect(request.request.params.get('month')).toBe('2026-11');
        respondData(request, summary);

        await expect(result).resolves.toEqual(summary);
    });

    it('marca a fatura como paga com PUT e desmarca com DELETE em /payment', async () => {
        const paid = firstValueFrom(service.markBillPaid('card-1', '2026-11'));
        respondData(
            expectApiCall(http, 'PUT', 'credit-cards/card-1/bills/2026-11/payment'),
            aBillStatus({ status: 'paid' }),
        );
        await expect(paid).resolves.toMatchObject({ status: 'paid' });

        const unpaid = firstValueFrom(service.unmarkBillPaid('card-1', '2026-11'));
        respondData(expectApiCall(http, 'DELETE', 'credit-cards/card-1/bills/2026-11/payment'), aBillStatus());
        await expect(unpaid).resolves.toMatchObject({ status: 'closed' });
    });
});
