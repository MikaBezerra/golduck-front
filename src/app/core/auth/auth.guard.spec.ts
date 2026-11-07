import { TestBed } from '@angular/core/testing';
import {
    type ActivatedRouteSnapshot,
    type CanActivateFn,
    provideRouter,
    Router,
    type RouterStateSnapshot,
    UrlTree,
} from '@angular/router';

import { authGuard, guestGuard } from './auth.guard';
import { TokenStorageService } from './token-storage.service';

function run(guard: CanActivateFn, url = '/'): ReturnType<CanActivateFn> {
    return TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot));
}

describe('guards de autenticação', () => {
    let tokens: TokenStorageService;
    let router: Router;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        tokens = TestBed.inject(TokenStorageService);
        router = TestBed.inject(Router);
    });

    afterEach(() => localStorage.clear());

    it('authGuard deixa entrar quem tem sessão', () => {
        tokens.save({ accessToken: 'token' });

        expect(run(authGuard, '/despesas')).toBe(true);
    });

    it('authGuard manda para o login lembrando a página pedida', () => {
        const result = run(authGuard, '/despesas');

        expect(result).toBeInstanceOf(UrlTree);
        expect(router.serializeUrl(result as UrlTree)).toBe('/login?redirect=%2Fdespesas');
    });

    it('guestGuard deixa abrir o login sem sessão', () => {
        expect(run(guestGuard)).toBe(true);
    });

    it('guestGuard manda quem já entrou para a página inicial', () => {
        tokens.save({ accessToken: 'token' });

        const result = run(guestGuard);

        expect(router.serializeUrl(result as UrlTree)).toBe('/');
    });
});
