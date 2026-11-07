import { Injectable, signal } from '@angular/core';

import type { AuthTokens } from './auth.models';

const REFRESH_TOKEN_KEY = 'financas.refreshToken';

/** Renova o access token um pouco antes de ele vencer, para não perder uma requisição no meio do caminho. */
const EXPIRY_MARGIN_MS = 30_000;

/**
 * Onde os tokens ficam guardados.
 *
 * - Access token: só em memória. Some ao recarregar a página (aí é renovado com o refresh token).
 * - Refresh token: no `localStorage`, para a sessão sobreviver ao fechar a aba.
 *   Qualquer script rodando na página consegue ler o `localStorage`; o ideal futuro é o back
 *   devolver o refresh token num cookie `httpOnly`, que o JavaScript não enxerga.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
    private accessToken: string | null = null;
    private readonly sessionActive = signal(readRefreshToken() !== null);

    /** Existe uma sessão (refresh token guardado)? Não garante que ela ainda seja válida no back. */
    public readonly hasSession = this.sessionActive.asReadonly();

    public constructor() {
        // Login ou logout feito em outra aba: mantém esta aba em sincronia.
        window.addEventListener('storage', (event) => {
            if (event.key === REFRESH_TOKEN_KEY || event.key === null) {
                if (!event.newValue) {
                    this.accessToken = null;
                }

                this.sessionActive.set(readRefreshToken() !== null);
            }
        });
    }

    public save(tokens: AuthTokens): void {
        this.accessToken = tokens.accessToken;
        writeRefreshToken(tokens.refreshToken);
        this.sessionActive.set(true);
    }

    public clear(): void {
        this.accessToken = null;
        writeRefreshToken(null);
        this.sessionActive.set(false);
    }

    /** Lido sempre do storage: outra aba pode ter renovado a sessão e trocado o token. */
    public getRefreshToken(): string | null {
        return readRefreshToken();
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

function readRefreshToken(): string | null {
    try {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
        return null;
    }
}

function writeRefreshToken(token: string | null): void {
    try {
        if (token === null) {
            localStorage.removeItem(REFRESH_TOKEN_KEY);
        } else {
            localStorage.setItem(REFRESH_TOKEN_KEY, token);
        }
    } catch {
        // Sem acesso ao storage: a sessão dura só enquanto a página estiver aberta.
    }
}
