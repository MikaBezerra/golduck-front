import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ApiError } from './api-error';
import { ApiService } from './api.service';

describe('ApiService', () => {
    let api: ApiService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });

        api = TestBed.inject(ApiService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('desembrulha o envelope { data }', async () => {
        const result = firstValueFrom(api.get<string[]>('categories'));

        http.expectOne('/api/categories').flush({ data: ['a', 'b'] });

        await expect(result).resolves.toEqual(['a', 'b']);
    });

    it('envia query string sem valores vazios', async () => {
        const result = firstValueFrom(api.get<unknown[]>('incomes', { year: 2026, other: undefined }));

        const request = http.expectOne((req) => req.url === '/api/incomes');
        expect(request.request.params.get('year')).toBe('2026');
        expect(request.request.params.has('other')).toBe(false);
        request.flush({ data: [] });

        await expect(result).resolves.toEqual([]);
    });

    it('trata 204 sem corpo', async () => {
        const result = firstValueFrom(api.delete('manual-expenses', { ids: ['1'] }));

        const request = http.expectOne('/api/manual-expenses');
        expect(request.request.body).toEqual({ ids: ['1'] });
        request.flush(null, { status: 204, statusText: 'No Content' });

        await expect(result).resolves.toBeUndefined();
    });

    it('envia PUT com o corpo', async () => {
        const result = firstValueFrom(api.put<string>('credit-cards/c-1/bills/2026-11', { bestPurchaseDate: null }));

        const request = http.expectOne('/api/credit-cards/c-1/bills/2026-11');
        expect(request.request.method).toBe('PUT');
        expect(request.request.body).toEqual({ bestPurchaseDate: null });
        request.flush({ data: 'ok' });

        await expect(result).resolves.toBe('ok');
    });

    it('envia os headers extras da chamada (ex.: Idempotency-Key)', async () => {
        const result = firstValueFrom(
            api.post('summary/dispatches', { month: '2026-11' }, { headers: { 'Idempotency-Key': 'k-1' } }),
        );

        const request = http.expectOne('/api/summary/dispatches');
        expect(request.request.headers.get('Idempotency-Key')).toBe('k-1');
        request.flush({ data: 'ok' });

        await expect(result).resolves.toBe('ok');
    });

    it('converte o erro do back em ApiError', async () => {
        const result = firstValueFrom(api.post('categories', { name: '' }));

        http.expectOne('/api/categories').flush(
            {
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Os dados enviados são inválidos',
                    requestId: 'req-1',
                    details: [{ field: 'name', code: 'string.empty', message: 'Nome é obrigatório' }],
                },
            },
            { status: 400, statusText: 'Bad Request' },
        );

        const error = await result.catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({
            status: 400,
            code: 'VALIDATION_ERROR',
            message: 'Os dados enviados são inválidos',
            requestId: 'req-1',
        });
        expect((error as ApiError).details).toHaveLength(1);
    });

    it('identifica falha de conexão', async () => {
        const result = firstValueFrom(api.get('people'));

        http.expectOne('/api/people').error(new ProgressEvent('error'), { status: 0 });

        await expect(result).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    });
});
