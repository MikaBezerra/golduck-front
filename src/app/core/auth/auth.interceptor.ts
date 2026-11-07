import { HttpErrorResponse, type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, type Observable, of, switchMap, throwError } from 'rxjs';

import { API_BASE_URL } from '../api/api.service';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

/**
 * Equivale a um interceptor do NestJS, só que do lado de quem faz a requisição:
 *
 * 1. Coloca `Authorization: Bearer <token>` em toda chamada à API.
 * 2. Se o token estiver vencendo, renova antes de enviar.
 * 3. Se o back responder 401 mesmo assim, renova e tenta de novo (uma vez só).
 *
 * O logout é a exceção: o back encerra a sessão pelo cookie e aceita o access token mesmo vencido,
 * então ele vai com o token que estiver em memória, sem renovar antes nem tentar de novo.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
    const baseUrl = inject(API_BASE_URL);

    if (!request.url.startsWith(`${baseUrl}/`) || isPublicRoute(request.url, baseUrl)) {
        return next(request);
    }

    const tokens = inject(TokenStorageService);

    if (request.url === `${baseUrl}/${LOGOUT_ROUTE}`) {
        return next(withBearer(request, tokens.getAccessToken()));
    }

    const auth = inject(AuthService);

    const currentToken = tokens.getValidAccessToken();
    const token$: Observable<string | null> =
        currentToken !== null ? of(currentToken) : tokens.hasSession() ? auth.refreshAccessToken() : of(null);

    return token$.pipe(
        switchMap((token) =>
            next(withBearer(request, token)).pipe(
                catchError((error: unknown) => {
                    const unauthorized = error instanceof HttpErrorResponse && error.status === 401;

                    if (!unauthorized || !tokens.hasSession()) {
                        return throwError(() => error);
                    }

                    // Outra requisição pode já ter renovado enquanto esta estava no ar.
                    const latest = tokens.getValidAccessToken();
                    const fresh$ = latest !== null && latest !== token ? of(latest) : auth.refreshAccessToken();

                    return fresh$.pipe(switchMap((freshToken) => next(withBearer(request, freshToken))));
                }),
            ),
        ),
    );
};

/** Rotas que não precisam (nem devem esperar) um access token. */
const PUBLIC_ROUTES = ['auth/login', 'auth/refresh', 'version', 'health/live'];

const LOGOUT_ROUTE = 'auth/logout';

function isPublicRoute(url: string, baseUrl: string): boolean {
    return PUBLIC_ROUTES.some((route) => url === `${baseUrl}/${route}`);
}

function withBearer<T>(request: HttpRequest<T>, token: string | null): HttpRequest<T> {
    return token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
}
