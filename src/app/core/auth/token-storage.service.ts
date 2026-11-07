import { Injectable, signal } from '@angular/core';

import { storageKey } from '../storage/storage-key';
import type { AuthTokens } from './auth.models';

/** Marca (não secreta) de que existe uma sessão. O refresh token em si fica no cookie httpOnly. */
const SESSION_KEY = storageKey('session');

/** Renova o access token um pouco antes de ele vencer, para não perder uma requisição no meio do caminho. */
const EXPIRY_MARGIN_MS = 30_000;

/**
 * Onde a sessão fica guardada.
 *
 * - Access token: só em memória. Some ao recarregar a página (aí é renovado pelo refresh).
 * - Refresh token: num cookie `httpOnly` que o back grava. O JavaScript não consegue ler o cookie,
 *   então um script malicioso na página não consegue roubá-lo.
 * - No `localStorage` fica só uma marca de que há sessão (para o guard e para as outras abas).
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
    private accessToken: string | null = null;
    private readonly sessionActive = signal(readSessionFlag());

    /** Existe uma sessão? Não garante que ela ainda seja válida no back. */
    public readonly hasSession = this.sessionActive.asReadonly();

    public constructor() {
        // Login ou logout feito em outra aba: mantém esta aba em sincronia.
        window.addEventListener('storage', (event) => {
            if (event.key === SESSION_KEY || event.key === null) {
                if (!event.newValue) {
                    this.accessToken = null;
                }

                this.sessionActive.set(readSessionFlag());
            }
        });
    }

    public save(tokens: AuthTokens): void {
        this.accessToken = tokens.accessToken;
        write(SESSION_KEY, '1');
        this.sessionActive.set(true);
    }

    public clear(): void {
        this.accessToken = null;
        write(SESSION_KEY, null);
        this.sessionActive.set(false);
    }

    /** Access token atual, ou `null` se não houver ou se estiver para vencer. */
    public getValidAccessToken(): string | null {
        if (!this.accessToken) {
            return null;
        }

        const expiresAt = readJwtExpiration(this.accessToken);

        if (expiresAt !== null && expiresAt - Date.now() <= EXPIRY_MARGIN_MS) {
            return null;
        }

        return this.accessToken;
    }
}

/** Lê o campo `exp` (em segundos) do JWT sem validar a assinatura — quem valida é o back. */
function readJwtExpiration(token: string): number | null {
    try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const exp: unknown = (JSON.parse(json) as { exp?: unknown }).exp;

        return typeof exp === 'number' ? exp * 1000 : null;
    } catch {
        return null;
    }
}

function readSessionFlag(): boolean {
    return read(SESSION_KEY) !== null;
}

function read(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function write(key: string, value: string | null): void {
    try {
        if (value === null) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, value);
        }
    } catch {
        // Sem acesso ao storage (aba anônima restrita): a sessão dura só enquanto a página estiver aberta.
    }
}
