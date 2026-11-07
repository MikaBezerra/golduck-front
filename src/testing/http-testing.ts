import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';

/*
 * Auxiliares para testar o contrato com o back: cada service deve chamar a rota certa, com o
 * método, os parâmetros e o corpo certos. Nenhuma requisição sai de verdade: o
 * `HttpTestingController` segura cada chamada até o teste responder.
 */

/** Configura o TestBed com um HttpClient falso e devolve o controlador das requisições. */
export function setupHttpTesting(providers: (Provider | EnvironmentProviders)[] = []): HttpTestingController {
    TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting(), ...providers],
    });

    return TestBed.inject(HttpTestingController);
}

/** Espera exatamente uma chamada com este método e caminho (sem a query) e devolve-a para conferir e responder. */
export function expectApiCall(http: HttpTestingController, method: string, path: string): TestRequest {
    return http.expectOne(
        (request) => request.method === method && request.url === `/api/${path}`,
        `${method} /api/${path}`,
    );
}

/** Query string da chamada como objeto simples, para comparar com `toEqual`. */
export function queryOf(request: TestRequest): Record<string, string> {
    const params = request.request.params;

    return Object.fromEntries(params.keys().map((key) => [key, params.get(key) ?? '']));
}

/** Responde no envelope `{ data }` do back. */
export function respondData(request: TestRequest, data: unknown): void {
    request.flush({ data });
}

/** Responde 204 (sem corpo), como nas exclusões. */
export function respondNoContent(request: TestRequest): void {
    request.flush(null, { status: 204, statusText: 'No Content' });
}

/** Responde com o formato de erro do back: `{ error: { code, message, requestId, details? } }`. */
export function respondError(
    request: TestRequest,
    status: number,
    error: { code: string; message: string; details?: { field: string; code: string; message: string }[] },
): void {
    request.flush({ error: { requestId: 'req-teste', ...error } }, { status, statusText: 'Erro' });
}
