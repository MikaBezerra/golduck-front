import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ApiError } from './api-error';
import { REQUEST_ID_HEADER } from './api-headers';
import { API_BASE_URL } from './api.service';
import { requestIdInterceptor } from './request-id.interceptor';

describe('requestIdInterceptor', () => {
    let http: HttpClient;
    let backend: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([requestIdInterceptor])),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: '/api' },
            ],
        });
        http = TestBed.inject(HttpClient);
        backend = TestBed.inject(HttpTestingController);
    });

    afterEach(() => backend.verify());

    it('envia um UUID no x-request-id das chamadas à API', () => {
        void firstValueFrom(http.get('/api/categories'));

        const id = backend.expectOne('/api/categories').request.headers.get(REQUEST_ID_HEADER);

        expect(id).toMatch(/^[0-9a-f-]{36}$/);
        expect(id).toMatch(/^[A-Za-z0-9._-]{8,128}$/);
    });

    it('não mexe em chamadas para fora da API e mantém um id já presente', () => {
        void firstValueFrom(http.get('/assets/x.json'));
        void firstValueFrom(http.get('/api/people', { headers: { [REQUEST_ID_HEADER]: 'fixo-123456' } }));

        expect(backend.expectOne('/assets/x.json').request.headers.has(REQUEST_ID_HEADER)).toBe(false);
        expect(backend.expectOne('/api/people').request.headers.get(REQUEST_ID_HEADER)).toBe('fixo-123456');
    });

    it('em falha de rede (status 0) o erro ainda traz o id enviado', async () => {
        const result = firstValueFrom(http.get('/api/incomes'));
        const request = backend.expectOne('/api/incomes');
        const sent = request.request.headers.get(REQUEST_ID_HEADER);

        request.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

        const error = await result.catch((caught: unknown) => caught);
        const apiError = ApiError.from(error);

        expect(error).toBeInstanceOf(HttpErrorResponse);
        expect(apiError).toMatchObject({ code: 'NETWORK_ERROR', requestId: sent });
        expect(apiError.supportCode).toBe(sent?.slice(0, 8));
        expect(apiError.userMessage).toContain(`código de suporte: ${sent?.slice(0, 8)}`);
    });

    it('resposta sem o formato do back vira um código com nome', async () => {
        const result = firstValueFrom(http.get('/api/summary'));

        backend.expectOne('/api/summary').flush('<html>Bad gateway</html>', { status: 503, statusText: 'Unavailable' });

        const apiError = ApiError.from(await result.catch((caught: unknown) => caught));

        expect(apiError.code).toBe('SERVICE_UNAVAILABLE');
        expect(apiError.message).toContain('indisponível');
        expect(apiError.requestId).not.toBeNull();
    });
});
