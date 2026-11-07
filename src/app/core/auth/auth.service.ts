import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { defer, finalize, firstValueFrom, map, type Observable, shareReplay, tap, throwError } from 'rxjs';

import { ApiError } from '../api/api-error';
import { ApiService } from '../api/api.service';
import { NotificationService } from '../notification/notification.service';
import { storageKey } from '../storage/storage-key';
import type { AuthTokens, AuthUser, LoginRequest } from './auth.models';
import { TokenStorageService } from './token-storage.service';

const REFRESH_LOCK_NAME = storageKey('auth.refresh');

/** Pausa nas renovações depois de um 429 sem Retry-After. */
const DEFAULT_REFRESH_COOLDOWN_S = 30;

/**
 * Sessão do usuário: entrar, sair e renovar o access token.
 *
 * O refresh token vive num cookie httpOnly do back: login, refresh e logout vão com
 * `withCredentials` para o navegador mandar e receber esse cookie.
 *
 * Ponto delicado: o back troca o refresh token a cada renovação e, se o mesmo
 * refresh token for usado duas vezes, entende como roubo e derruba a sessão.
 * Por isso `refreshAccessToken()` garante UMA renovação por vez:
 * - dentro da aba: todas as requisições que precisarem esperam a mesma chamada;
 * - entre abas: um "lock" do navegador faz uma aba esperar a outra terminar.
 *
 * Se o back limitar as renovações (429), a sessão continua: as próximas tentativas falham na hora,
 * sem chamar o back, até passar o tempo do Retry-After (nada de loop de refresh nem de logout).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly api = inject(ApiService);
    private readonly tokens = inject(TokenStorageService);
    private readonly router = inject(Router);
    private readonly notifications = inject(NotificationService);

    private refreshInFlight: Observable<string> | null = null;
    /** Até quando (ms) as renovações estão pausadas por um 429. */
    private refreshBlockedUntil = 0;
    private readonly currentUser = signal<AuthUser | null>(null);
    private loadingUser = false;

    public readonly isAuthenticated = this.tokens.hasSession;
    /** Quem está logado (`GET /auth/me`). Fica `null` até a primeira resposta. */
    public readonly user = this.currentUser.asReadonly();

    public login(credentials: LoginRequest): Observable<void> {
        return this.api.post<AuthTokens>('auth/login', credentials, { withCredentials: true }).pipe(
            tap((tokens) => this.tokens.save(tokens)),
            tap(() => this.loadUser()),
            map(() => undefined),
        );
    }

    /** Busca os dados do usuário logado. Falhas são ignoradas: é só informação de tela. */
    public loadUser(): void {
        if (this.loadingUser) {
            return;
        }

        this.loadingUser = true;
        this.api
            .get<AuthUser>('auth/me')
            .pipe(finalize(() => (this.loadingUser = false)))
            .subscribe({
                next: (user) => this.currentUser.set(user),
                error: () => undefined,
            });
    }

    /** Novo access token. Chamadas simultâneas compartilham a mesma renovação. */
    public refreshAccessToken(): Observable<string> {
        const waitMs = this.refreshBlockedUntil - Date.now();

        if (waitMs > 0) {
            return throwError(() => ApiError.tooManyRequests(Math.ceil(waitMs / 1000)));
        }

        this.refreshInFlight ??= defer(async () => this.runRefresh()).pipe(
            finalize(() => (this.refreshInFlight = null)),
            shareReplay({ bufferSize: 1, refCount: false }),
        );

        return this.refreshInFlight;
    }

    /** Encerra a sessão no back (melhor esforço) e volta para o login. */
    public logout(): void {
        const finish = (): void => {
            this.currentUser.set(null);
            this.tokens.clear();
            void this.router.navigate(['/login']);
        };

        if (!this.tokens.hasSession()) {
            finish();
            return;
        }

        this.api.post<void>('auth/logout', undefined, { withCredentials: true }).subscribe({
            complete: finish,
            error: finish,
        });
    }

    /** Sessão recusada pelo back (vencida, revogada ou usuário desativado). */
    public expireSession(): void {
        if (!this.tokens.hasSession()) {
            return;
        }

        this.currentUser.set(null);
        this.tokens.clear();
        this.notifications.info('Sua sessão expirou. Entre novamente.');
        this.redirectToLogin();
    }

    /** Vai para o login lembrando a página atual, para voltar a ela depois de entrar. */
    public redirectToLogin(): void {
        const currentUrl = this.router.url;
        const queryParams =
            currentUrl && currentUrl !== '/' && !currentUrl.startsWith('/login') ? { redirect: currentUrl } : {};

        void this.router.navigate(['/login'], { queryParams });
    }

    private async runRefresh(): Promise<string> {
        return withCrossTabLock(async () => {
            if (!this.tokens.hasSession()) {
                throw new ApiError(401, 'AUTH_NO_SESSION', 'Autenticação necessária');
            }

            // O cookie vai sozinho. Só o back antigo precisa do token no corpo (legado).
            const legacyToken = this.tokens.getLegacyRefreshToken();
            const body = legacyToken ? { refreshToken: legacyToken } : undefined;

            try {
                const tokens = await firstValueFrom(
                    this.api.post<AuthTokens>('auth/refresh', body, { withCredentials: true }),
                );
                this.tokens.save(tokens);

                return tokens.accessToken;
            } catch (error: unknown) {
                const apiError = ApiError.from(error);

                // 400/401: o refresh token não serve mais. Falha de rede (status 0) não derruba a sessão.
                if (apiError.status === 400 || apiError.status === 401) {
                    this.expireSession();
                }

                // 429: muitas renovações. Mantém a sessão e pausa novas tentativas pelo tempo pedido.
                if (apiError.status === 429) {
                    const seconds = apiError.retryAfterSeconds ?? DEFAULT_REFRESH_COOLDOWN_S;

                    this.refreshBlockedUntil = Date.now() + seconds * 1000;
                }

                throw apiError;
            }
        });
    }
}

async function withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
    const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;

    return locks ? locks.request(REFRESH_LOCK_NAME, task) : task();
}
