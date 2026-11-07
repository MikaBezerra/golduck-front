import type { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { NotificationService } from '../notification/notification.service';
import { expectApiCall, respondData, respondError, setupHttpTesting } from '../../../testing/http-testing';
import { notificationsMock, type NotificationsMock } from '../../../testing/mocks';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

const USER = { id: 'user-1', email: 'admin@exemplo.com', role: 'ADMIN' };

describe('AuthService', () => {
    let http: HttpTestingController;
    let auth: AuthService;
    let tokens: TokenStorageService;
    let router: Router;
    let notifications: NotificationsMock;
    let navigate: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        localStorage.clear();
        notifications = notificationsMock();
        http = setupHttpTesting([provideRouter([]), { provide: NotificationService, useValue: notifications }]);
        auth = TestBed.inject(AuthService);
        tokens = TestBed.inject(TokenStorageService);
        router = TestBed.inject(Router);
        navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    afterEach(() => {
        http.verify();
        localStorage.clear();
    });

    it('login envia as credenciais com cookie, guarda o access token e busca o usuário', async () => {
        const result = firstValueFrom(auth.login({ email: USER.email, password: 'senha-123' }));
        const login = expectApiCall(http, 'POST', 'auth/login');

        expect(login.request.body).toEqual({ email: USER.email, password: 'senha-123' });
        expect(login.request.withCredentials).toBe(true);
        respondData(login, { accessToken: 'token-1' });
        await expect(result).resolves.toBeUndefined();

        expect(tokens.getAccessToken()).toBe('token-1');
        expect(auth.isAuthenticated()).toBe(true);

        respondData(expectApiCall(http, 'GET', 'auth/me'), USER);
        expect(auth.user()).toEqual(USER);
    });

    it('login recusado não cria sessão', async () => {
        const result = firstValueFrom(auth.login({ email: USER.email, password: 'errada' }));
        respondError(expectApiCall(http, 'POST', 'auth/login'), 401, {
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'Credenciais inválidas',
        });

        await expect(result).rejects.toMatchObject({ code: 'AUTH_INVALID_CREDENTIALS' });
        expect(auth.isAuthenticated()).toBe(false);
    });

    it('busca o usuário uma vez só mesmo chamado em seguida e ignora falhas', () => {
        auth.loadUser();
        auth.loadUser();

        respondError(expectApiCall(http, 'GET', 'auth/me'), 500, { code: 'INTERNAL_ERROR', message: 'Erro' });
        expect(auth.user()).toBeNull();

        auth.loadUser();
        respondData(expectApiCall(http, 'GET', 'auth/me'), USER);
        expect(auth.user()).toEqual(USER);
    });

    it('logout sem sessão só volta para o login, sem chamar o back', () => {
        auth.logout();

        expect(navigate).toHaveBeenCalledWith(['/login']);
    });

    it('logout com sessão avisa o back e limpa tudo, mesmo se o back falhar', () => {
        tokens.save({ accessToken: 'token-1' });

        auth.logout();
        respondError(expectApiCall(http, 'POST', 'auth/logout'), 500, { code: 'INTERNAL_ERROR', message: 'Erro' });

        expect(tokens.hasSession()).toBe(false);
        expect(tokens.getAccessToken()).toBeNull();
        expect(auth.user()).toBeNull();
        expect(navigate).toHaveBeenCalledWith(['/login']);
    });

    it('sessão expirada limpa a sessão, avisa e volta ao login lembrando a página', () => {
        tokens.save({ accessToken: 'token-1' });
        vi.spyOn(router, 'url', 'get').mockReturnValue('/despesas');

        auth.expireSession();

        expect(tokens.hasSession()).toBe(false);
        expect(notifications.info).toHaveBeenCalledWith('Sua sessão expirou. Entre novamente.');
        expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { redirect: '/despesas' } });
    });

    it('sessão expirada sem sessão não faz nada', () => {
        auth.expireSession();

        expect(notifications.info).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
    });

    it('não lembra a página inicial nem o próprio login no redirecionamento', () => {
        for (const url of ['/', '/login?redirect=%2Fdespesas']) {
            vi.spyOn(router, 'url', 'get').mockReturnValue(url);
            auth.redirectToLogin();
            expect(navigate).toHaveBeenLastCalledWith(['/login'], { queryParams: {} });
        }
    });

    it('renovar sem sessão falha sem chamar o back', async () => {
        await expect(firstValueFrom(auth.refreshAccessToken())).rejects.toMatchObject({ code: 'AUTH_NO_SESSION' });
    });

    it('falha de rede na renovação mantém a sessão', async () => {
        tokens.save({ accessToken: 'token-1' });

        const result = firstValueFrom(auth.refreshAccessToken());
        // A renovação passa por etapas assíncronas antes de chamar o back: espera a chamada aparecer.
        const refresh = await vi.waitFor(() => expectApiCall(http, 'POST', 'auth/refresh'));
        refresh.error(new ProgressEvent('error'), { status: 0 });

        await expect(result).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
        expect(tokens.hasSession()).toBe(true);
    });
});
