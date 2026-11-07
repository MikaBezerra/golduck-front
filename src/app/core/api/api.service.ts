import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { catchError, map, type Observable, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiError } from './api-error';
import type { ApiSuccessResponse, QueryParams } from './api.types';

/**
 * Prefixo de todas as rotas da API, vindo do arquivo de ambiente do build
 * (`src/environments`). Em dev é `/api`, e o `proxy.conf.json` leva até o back.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
    providedIn: 'root',
    factory: () => environment.apiBaseUrl,
});

/**
 * Único ponto de saída HTTP da aplicação.
 *
 * - Desembrulha o envelope `{ data }` do back: quem chama recebe só o conteúdo.
 * - Converte qualquer falha em `ApiError` (com a mensagem em pt-BR vinda do back).
 *
 * Os services de cada feature usam este service em vez do `HttpClient` direto,
 * do mesmo jeito que os services do back usam o repository em vez do Prisma direto.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(API_BASE_URL);

    public get<T>(path: string, query?: QueryParams): Observable<T> {
        return this.unwrap(this.http.get<ApiSuccessResponse<T>>(this.url(path), { params: toHttpParams(query) }));
    }

    public post<T>(path: string, body?: unknown): Observable<T> {
        return this.unwrap(this.http.post<ApiSuccessResponse<T>>(this.url(path), body ?? null));
    }

    public patch<T>(path: string, body: unknown): Observable<T> {
        return this.unwrap(this.http.patch<ApiSuccessResponse<T>>(this.url(path), body));
    }

    public delete<T = void>(path: string, body?: unknown): Observable<T> {
        return this.unwrap(this.http.delete<ApiSuccessResponse<T>>(this.url(path), { body }));
    }

    private url(path: string): string {
        return `${this.baseUrl}/${path.replace(/^\/+/, '')}`;
    }

    private unwrap<T>(request: Observable<ApiSuccessResponse<T> | null>): Observable<T> {
        return request.pipe(
            // 204 No Content chega como `null`: não há `data` para desembrulhar.
            map((response) => (response === null ? undefined : response.data) as T),
            catchError((error: unknown) => throwError(() => ApiError.from(error))),
        );
    }
}

function toHttpParams(query?: QueryParams): HttpParams | undefined {
    if (!query) {
        return undefined;
    }

    let params = new HttpParams();

    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
            params = params.set(key, String(value));
        }
    }

    return params;
}
