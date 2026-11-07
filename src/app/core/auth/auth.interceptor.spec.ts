import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';

import { ApiService } from '../api/api.service';
import { authInterceptor } from './auth.interceptor';
import { TokenStorageService } from './token-storage.service';

/** JWT falso: só o `exp` importa para o front. */
function fakeJwt(secondsToExpire: number): string {
    const payload = btoa(
        JSON.stringify({ sub: 'user', sid: 'session', exp: Math.floor(Date.now() / 1000) + secondsToExpire }),
    );

    return `header.${payload.replace(/=+$/, '')}.signature`;
}

/** Espera as promessas pendentes (a renovação roda dentro de uma Promise). */
async function settle(): Promise<void> {
    for (let i = 0; i < 5; i++) {
        await Promise.resolve();
    }
}

describe('authInterceptor', () => {
    let api: ApiService;
    let http: HttpTestingController;
    let tokens: TokenStorageService;

    beforeEach(() => {
        localStorage.clear();

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([authInterceptor])),
                provideHttpClientTesting(),
                provideRouter([]),
                MessageService,
            ],
        });

        api = TestBed.inject(ApiService);
        http = TestBed.inject(HttpTestingController);
        tokens = TestBed.inject(TokenStorageService);
    });

    afterEach(() => http.verify());

    it('envia o access token válido', async () => {
        const access = fakeJwt(600);
        tokens.save({ accessToken: access });

        const result = firstValueFrom(api.get('people'));
        const request = http.expectOne('/api/people');

        expect(request.request.headers.get('Authorization')).toBe(`Bearer ${access}`);
        request.flush({ data: [] });
        await result;
    });

    it('não envia token para login e refresh', () => {
        tokens.save({ accessToken: fakeJwt(600) });

        void firstValueFrom(api.post('auth/login', { email: 'a', password: 'b' }));
        const request = http.expectOne('/api/auth/login');

        expect(request.request.headers.has('Authorization')).toBe(false);
        request.flush({ data: { accessToken: fakeJwt(600) } });
    });

    it('faz UMA renovação para várias requisições com token vencido', async () => {
        tokens.save({ accessToken: fakeJwt(5) });

        const results = Promise.all([
            firstValueFrom(api.get('people')),
            firstValueFrom(api.get('categories')),
            firstValueFrom(api.get('incomes')),
        ]);
        await settle();

        const refresh = http.expectOne('/api/auth/refresh');

        const newAccess = fakeJwt(900);
        refresh.flush({ data: { accessToken: newAccess } });
        await settle();

        for (const url of ['/api/people', '/api/categories', '/api/incomes']) {
            const request = http.expectOne(url);
            expect(request.request.headers.get('Authorization')).toBe(`Bearer ${newAccess}`);
            request.flush({ data: [] });
        }

        await results;
    });

    it('renova e repete a requisição quando o back responde 401', async () => {
        tokens.save({ accessToken: fakeJwt(600) });

        const result = firstValueFrom(api.get<string[]>('people'));
        http.expectOne('/api/people').flush(
            { error: { code: 'AUTH_UNAUTHENTICATED', message: 'Autenticação necessária', requestId: 'r' } },
            { status: 401, statusText: 'Unauthorized' },
        );
        await settle();

        const newAccess = fakeJwt(900);
        http.expectOne('/api/auth/refresh').flush({ data: { accessToken: newAccess } });
        await settle();

        const retry = http.expectOne('/api/people');
        expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${newAccess}`);
        retry.flush({ data: ['Ana'] });

        await expect(result).resolves.toEqual(['Ana']);
    });

    it('encerra a sessão quando o refresh é recusado', async () => {
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        tokens.save({ accessToken: fakeJwt(5) });

        const result = firstValueFrom(api.get('people'));
        await settle();

        http.expectOne('/api/auth/refresh').flush(
            { error: { code: 'AUTH_INVALID_SESSION', message: 'Sessão inválida', requestId: 'r' } },
            { status: 401, statusText: 'Unauthorized' },
        );

        await expect(result).rejects.toMatchObject({ code: 'AUTH_INVALID_SESSION' });
        expect(tokens.hasSession()).toBe(false);
        expect(navigate).toHaveBeenCalledWith(['/login'], expect.anything());
    });

    it('cookie httpOnly: renova sem mandar token no corpo, com credenciais, e nada fica no storage', async () => {
        tokens.save({ accessToken: fakeJwt(5) });

        const result = firstValueFrom(api.get('people'));
        await settle();

        const refresh = http.expectOne('/api/auth/refresh');
        expect(refresh.request.body).toBeNull();
        expect(refresh.request.withCredentials).toBe(true);

        const newAccess = fakeJwt(900);
        refresh.flush({ data: { accessToken: newAccess } });
        await settle();

        const request = http.expectOne('/api/people');
        expect(request.request.headers.get('Authorization')).toBe(`Bearer ${newAccess}`);
        request.flush({ data: ['Ana'] });

        await expect(result).resolves.toEqual(['Ana']);
        expect(Object.values(localStorage).some((value) => String(value).includes('.'))).toBe(false);
        expect(tokens.hasSession()).toBe(true);
    });

    it('refresh limitado (429) mantém a sessão e não tenta de novo antes do Retry-After', async () => {
        tokens.save({ accessToken: fakeJwt(5) });

        const first = firstValueFrom(api.get('people'));
        await settle();

        http.expectOne('/api/auth/refresh').flush(
            { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests', requestId: 'r-429' } },
            { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '45' } },
        );

        await expect(first).rejects.toMatchObject({
            code: 'TOO_MANY_REQUESTS',
            retryAfterSeconds: 45,
            message: 'Muitas tentativas seguidas. Tente de novo em 45 segundos.',
        });
        expect(tokens.hasSession()).toBe(true);

        // Logo depois: falha na hora, sem chamar o back de novo.
        const second = firstValueFrom(api.get('categories'));
        await settle();

        http.expectNone('/api/auth/refresh');
        await expect(second).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
        expect(tokens.hasSession()).toBe(true);
    });
});
