import { HttpErrorResponse } from '@angular/common/http';

import { supportCode } from '../logging/ids';
import { REQUEST_ID_HEADER, RETRY_AFTER_HEADER } from './api-headers';
import type { ApiErrorDetail, ApiErrorResponse } from './api.types';

const NETWORK_ERROR_MESSAGE = 'Não foi possível conectar ao servidor. Verifique se a API está no ar.';
const UNEXPECTED_ERROR_MESSAGE = 'Ocorreu um erro inesperado. Tente novamente.';

/**
 * Código de erro pelo status HTTP, quando a resposta não vem no formato do back
 * (os mesmos nomes que o back usa para erros que não vêm do código da aplicação).
 */
const STATUS_CODES: Readonly<Record<number, string>> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHENTICATED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    413: 'PAYLOAD_TOO_LARGE',
    429: 'TOO_MANY_REQUESTS',
    503: 'SERVICE_UNAVAILABLE',
};

/** Mensagens para quando o back não mandou uma (ex.: resposta de um proxy ou de uma página de erro). */
const FALLBACK_MESSAGES: Readonly<Record<string, string>> = {
    FORBIDDEN: 'Você não tem permissão para fazer isso.',
    NOT_FOUND: 'Não encontrado.',
    PAYLOAD_TOO_LARGE: 'O arquivo enviado é grande demais.',
    SERVICE_UNAVAILABLE: 'O serviço está indisponível no momento. Tente de novo em instantes.',
};

/**
 * Erro padronizado de qualquer chamada à API.
 * Equivale ao `AppError` do back-end: tem um `code` estável para o código
 * tomar decisões e uma `message` já pronta para mostrar ao usuário.
 */
export class ApiError extends Error {
    public constructor(
        public readonly status: number,
        public readonly code: string,
        message: string,
        public readonly requestId: string | null = null,
        public readonly details: readonly ApiErrorDetail[] = [],
        /** Em respostas 429: segundos até poder tentar de novo (header Retry-After), se o back informou. */
        public readonly retryAfterSeconds: number | null = null,
    ) {
        super(message);
        this.name = 'ApiError';
    }

    /** Converte qualquer erro (HTTP, rede, exceção) em `ApiError`. */
    public static from(error: unknown): ApiError {
        if (error instanceof ApiError) {
            return error;
        }

        if (error instanceof HttpErrorResponse) {
            // O id vem no corpo; senão no header da resposta; senão é o que o front enviou (falha de rede).
            const headerId = error.headers.get(REQUEST_ID_HEADER);

            if (error.status === 0) {
                return new ApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE, headerId);
            }

            if (error.status === 429) {
                const seconds = parseRetryAfter(error.headers.get(RETRY_AFTER_HEADER));
                const body = isApiErrorResponse(error.error) ? error.error.error : null;

                return ApiError.tooManyRequests(seconds, body?.requestId ?? headerId);
            }

            if (isApiErrorResponse(error.error)) {
                const body = error.error.error;

                return new ApiError(
                    error.status,
                    body.code,
                    body.message,
                    body.requestId ?? headerId,
                    body.details ?? [],
                );
            }

            const code = codeForStatus(error.status);

            return new ApiError(error.status, code, FALLBACK_MESSAGES[code] ?? UNEXPECTED_ERROR_MESSAGE, headerId);
        }

        return new ApiError(-1, 'UNEXPECTED_ERROR', UNEXPECTED_ERROR_MESSAGE);
    }

    /** Limite de tentativas: mensagem amigável dizendo quanto tempo esperar. */
    public static tooManyRequests(seconds: number | null, requestId: string | null = null): ApiError {
        const message =
            seconds === null
                ? 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.'
                : `Muitas tentativas seguidas. Tente de novo em ${formatWait(seconds)}.`;

        return new ApiError(429, 'TOO_MANY_REQUESTS', message, requestId, [], seconds);
    }

    public get isServerError(): boolean {
        return this.status >= 500;
    }

    /** Os 8 primeiros caracteres do id da requisição, para o usuário informar ao suporte. */
    public get supportCode(): string | null {
        return this.requestId ? supportCode(this.requestId) : null;
    }

    /** A mensagem para a tela, com o código de suporte quando houver. */
    public get userMessage(): string {
        const code = this.supportCode;

        return code ? `${this.message} (código de suporte: ${code})` : this.message;
    }
}

/** Retry-After vem em segundos ("60") ou como data HTTP; devolve os segundos que faltam. */
export function parseRetryAfter(value: string | null, now = Date.now()): number | null {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();

    if (/^\d+$/.test(trimmed)) {
        return Number(trimmed);
    }

    const date = Date.parse(trimmed);

    return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - now) / 1000));
}

/** 45 → "45 segundos"; 90 → "2 minutos". */
function formatWait(seconds: number): string {
    if (seconds < 60) {
        return seconds <= 1 ? '1 segundo' : `${seconds} segundos`;
    }

    const minutes = Math.ceil(seconds / 60);

    return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
}

function codeForStatus(status: number): string {
    return STATUS_CODES[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
    if (typeof value !== 'object' || value === null || !('error' in value)) {
        return false;
    }

    const body = (value as { error: unknown }).error;

    return (
        typeof body === 'object' &&
        body !== null &&
        typeof (body as { code?: unknown }).code === 'string' &&
        typeof (body as { message?: unknown }).message === 'string'
    );
}
