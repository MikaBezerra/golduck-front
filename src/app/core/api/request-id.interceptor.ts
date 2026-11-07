import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { newId } from '../logging/ids';
import { REQUEST_ID_HEADER } from './api-headers';
import { API_BASE_URL } from './api.service';

/**
 * Coloca um `x-request-id` (UUID) em toda chamada à nossa API. O back usa o mesmo id no log dele e
 * devolve no erro, então o "código de suporte" que o usuário vê aponta para a mesma requisição nos
 * dois lados.
 *
 * Se a resposta de erro não trouxer o id (ex.: falha de rede, status 0), ele é anexado ao erro,
 * para o `ApiError` ainda ter o código. Uma repetição da requisição (depois de renovar a sessão)
 * mantém o mesmo id.
 */
export const requestIdInterceptor: HttpInterceptorFn = (request, next) => {
    const baseUrl = inject(API_BASE_URL);

    if (!request.url.startsWith(`${baseUrl}/`)) {
        return next(request);
    }

    const id = request.headers.get(REQUEST_ID_HEADER) ?? newId();
    const withId = request.headers.has(REQUEST_ID_HEADER)
        ? request
        : request.clone({ setHeaders: { [REQUEST_ID_HEADER]: id } });

    return next(withId).pipe(
        catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && !error.headers.has(REQUEST_ID_HEADER)) {
                return throwError(
                    () =>
                        new HttpErrorResponse({
                            error: error.error,
                            headers: error.headers.set(REQUEST_ID_HEADER, id),
                            status: error.status,
                            statusText: error.statusText,
                            url: error.url ?? undefined,
                        }),
                );
            }

            return throwError(() => error);
        }),
    );
};
