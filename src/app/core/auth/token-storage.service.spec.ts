import { TestBed } from '@angular/core/testing';

import { TokenStorageService } from './token-storage.service';

const SESSION_KEY = 'golduck.session';

/** JWT só com o `exp` (o front não confere a assinatura; quem confere é o back). */
function jwtExpiringIn(ms: number): string {
    const payload = btoa(JSON.stringify({ exp: Math.floor((Date.now() + ms) / 1000) }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return `cabecalho.${payload}.assinatura`;
}

describe('TokenStorageService', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    function create(): TokenStorageService {
        return TestBed.inject(TokenStorageService);
    }

    it('guarda o access token só em memória e no storage apenas a marca de sessão', () => {
        const storage = create();

        storage.save({ accessToken: jwtExpiringIn(10 * 60_000) });

        expect(storage.hasSession()).toBe(true);
        expect(localStorage.getItem(SESSION_KEY)).toBe('1');
        expect(JSON.stringify(localStorage)).not.toContain('cabecalho');
    });

    it('limpa a sessão', () => {
        const storage = create();
        storage.save({ accessToken: 'token' });

        storage.clear();

        expect(storage.hasSession()).toBe(false);
        expect(storage.getAccessToken()).toBeNull();
        expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('começa com sessão quando a marca já existe (F5), mas sem token em memória', () => {
        localStorage.setItem(SESSION_KEY, '1');

        const storage = create();

        expect(storage.hasSession()).toBe(true);
        expect(storage.getAccessToken()).toBeNull();
        expect(storage.getValidAccessToken()).toBeNull();
    });

    it('considera vencido o token que expira em menos de 30 segundos', () => {
        const storage = create();

        storage.save({ accessToken: jwtExpiringIn(10 * 60_000) });
        expect(storage.getValidAccessToken()).not.toBeNull();

        storage.save({ accessToken: jwtExpiringIn(20_000) });
        expect(storage.getValidAccessToken()).toBeNull();
        // Vencido ainda serve para o logout.
        expect(storage.getAccessToken()).not.toBeNull();
    });

    it('token sem exp legível é usado como está (o back decide)', () => {
        const storage = create();

        storage.save({ accessToken: 'nao-e-um-jwt' });

        expect(storage.getValidAccessToken()).toBe('nao-e-um-jwt');
    });

    it('acompanha login e logout feitos em outra aba', () => {
        const storage = create();
        storage.save({ accessToken: 'token' });

        localStorage.removeItem(SESSION_KEY);
        window.dispatchEvent(new StorageEvent('storage', { key: SESSION_KEY, newValue: null }));

        expect(storage.hasSession()).toBe(false);
        expect(storage.getAccessToken()).toBeNull();

        localStorage.setItem(SESSION_KEY, '1');
        window.dispatchEvent(new StorageEvent('storage', { key: SESSION_KEY, newValue: '1' }));

        expect(storage.hasSession()).toBe(true);
    });

    it('ignora mudanças de outras chaves do storage', () => {
        const storage = create();
        storage.save({ accessToken: 'token' });

        window.dispatchEvent(new StorageEvent('storage', { key: 'outra.chave', newValue: null }));

        expect(storage.getAccessToken()).toBe('token');
    });
});
