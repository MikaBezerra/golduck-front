import type { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import {
    expectApiCall,
    queryOf,
    respondData,
    respondNoContent,
    setupHttpTesting,
} from '../../../../testing/http-testing';
import type { CardImportResult } from './card-import.models';
import { CardImportService } from './card-import.service';

const RESULT = {
    import: {
        id: 'import-1',
        cardId: 'card-1',
        month: '2026-11',
        fileName: 'fatura.csv',
        parserVersion: 'nubank-csv@1',
        rowCount: 3,
        ignoredCount: 0,
        expenseCount: 3,
        createdAt: '2026-11-01T12:00:00.000Z',
    },
    summary: { created: 3, updated: 0, removed: 0, projected: 0, ignored: 0 },
} as unknown as CardImportResult;

function statement(name = 'fatura.csv'): File {
    return new File(['data,descricao,valor'], name, { type: 'text/csv' });
}

describe('CardImportService (contrato com /api/card-imports)', () => {
    let http: HttpTestingController;
    let service: CardImportService;

    beforeEach(() => {
        http = setupHttpTesting();
        service = TestBed.inject(CardImportService);
    });

    afterEach(() => http.verify());

    it('pré-visualiza enviando cartão, mês e arquivo em multipart, sem senha quando não há', async () => {
        const result = firstValueFrom(service.preview({ cardId: 'card-1', month: '2026-11', file: statement() }));
        const request = expectApiCall(http, 'POST', 'card-imports/preview');
        const form = request.request.body as FormData;

        expect(form).toBeInstanceOf(FormData);
        expect(form.get('cardId')).toBe('card-1');
        expect(form.get('month')).toBe('2026-11');
        expect((form.get('file') as File).name).toBe('fatura.csv');
        expect(form.has('password')).toBe(false);
        respondData(request, { transactions: [], removed: [], summary: RESULT.summary });

        await expect(result).resolves.toMatchObject({ transactions: [] });
    });

    it('envia a senha do PDF quando informada', async () => {
        const result = firstValueFrom(
            service.preview({ cardId: 'card-2', month: '2026-11', file: statement('fatura.pdf'), password: '1234' }),
        );
        const request = expectApiCall(http, 'POST', 'card-imports/preview');

        expect((request.request.body as FormData).get('password')).toBe('1234');
        respondData(request, { transactions: [], removed: [], summary: RESULT.summary });

        await expect(result).resolves.toBeDefined();
    });

    it('salva com as escolhas e exclusões em JSON nos campos overrides e exclusions', async () => {
        const overrides = [{ key: 'k1', nickname: 'Feira', categoryId: 'category-2', personId: null }];
        const exclusions = [{ key: 'k2', action: 'exclude' as const, remember: true }];
        const result = firstValueFrom(
            service.save({ cardId: 'card-1', month: '2026-11', file: statement(), overrides, exclusions } as never),
        );
        const request = expectApiCall(http, 'POST', 'card-imports');
        const form = request.request.body as FormData;

        expect(JSON.parse(form.get('overrides') as string)).toEqual(overrides);
        expect(JSON.parse(form.get('exclusions') as string)).toEqual(exclusions);
        respondData(request, RESULT);

        await expect(result).resolves.toEqual(RESULT);
    });

    it('não manda overrides nem exclusions vazios', async () => {
        const result = firstValueFrom(
            service.save({ cardId: 'card-1', month: '2026-11', file: statement(), overrides: [], exclusions: [] }),
        );
        const request = expectApiCall(http, 'POST', 'card-imports');
        const form = request.request.body as FormData;

        expect(form.has('overrides')).toBe(false);
        expect(form.has('exclusions')).toBe(false);
        respondData(request, RESULT);

        await expect(result).resolves.toEqual(RESULT);
    });

    it('cria a fatura manual com JSON em /card-imports/manual', async () => {
        const body = {
            cardId: 'card-1',
            month: '2026-11',
            transactions: [{ date: '2026-10-10', description: 'Padaria', amount: '12.00', installment: null }],
        };
        const result = firstValueFrom(service.createManual(body as never));
        const request = expectApiCall(http, 'POST', 'card-imports/manual');

        expect(request.request.body).toEqual(body);
        respondData(request, RESULT);

        await expect(result).resolves.toEqual(RESULT);
    });

    it('lista o histórico com os filtros na query e apaga um envio pelo id', async () => {
        const listed = firstValueFrom(service.findAll({ cardId: 'card-1', month: '2026-11' }));
        const listRequest = expectApiCall(http, 'GET', 'card-imports');
        expect(queryOf(listRequest)).toEqual({ cardId: 'card-1', month: '2026-11' });
        respondData(listRequest, [RESULT.import]);
        await expect(listed).resolves.toHaveLength(1);

        const all = firstValueFrom(service.findAll());
        const allRequest = expectApiCall(http, 'GET', 'card-imports');
        expect(queryOf(allRequest)).toEqual({});
        respondData(allRequest, []);
        await expect(all).resolves.toEqual([]);

        const deleted = firstValueFrom(service.delete('import-1'));
        respondNoContent(expectApiCall(http, 'DELETE', 'card-imports/import-1'));
        await expect(deleted).resolves.toBeUndefined();
    });
});
