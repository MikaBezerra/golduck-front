/**
 * Formato das respostas do back-end (ver `common/http/response.types.ts` no back).
 *
 * Sucesso: `{ data: ... }`
 * Erro:    `{ error: { code, message, requestId, details? } }`
 */
export interface ApiSuccessResponse<T> {
    readonly data: T;
}

export interface ApiErrorDetail {
    /** Caminho do campo inválido, ex.: `name`, `changes.amount`, `months[0]`. */
    readonly field: string;
    readonly code: string;
    readonly message: string;
}

export interface ApiErrorBody {
    readonly code: string;
    readonly message: string;
    readonly requestId: string;
    readonly details?: ApiErrorDetail[];
}

export interface ApiErrorResponse {
    readonly error: ApiErrorBody;
}

/** Valores aceitos em query string (`?month=2026-11&year=2026`). */
export type QueryParams = Record<string, string | number | boolean | null | undefined>;
