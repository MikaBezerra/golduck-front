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
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
    const baseUrl = inject(API_BASE_URL);

    if (!request.url.startsWith(`${baseUrl}/`) || isPublicAuthRoute(request.url, baseUrl)) {
        return next(request);
    }

    const auth = inject(AuthService);
    const tokens = inject(TokenStorageService);

    const currentToken = tokens.getValidAccessToken();
    const token$: Observable<string | null> =
        currentToken !== null ? of(currentToken) : tokens.getRefreshToken() ? auth.refreshAccessToken() : of(null);

    return token$.pipe(
        switchMap((token) =>
            next(withBearer(request, token)).pipe(
                catchError((error: unknown) => {
                    const unauthorized = error instanceof HttpErrorResponse && error.status === 401;

                    if (!unauthorized || !tokens.getRefreshToken()) {
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

function isPublicAuthRoute(url: string, baseUrl: string): boolean {
    return url === `${baseUrl}/auth/login` || url === `${baseUrl}/auth/refresh`;
}

function withBearer<T>(request: HttpRequest<T>, token: string | null): HttpRequest<T> {
    return token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
}
