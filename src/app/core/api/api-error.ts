import { HttpErrorResponse } from '@angular/common/http';

import type { ApiErrorDetail, ApiErrorResponse } from './api.types';

const NETWORK_ERROR_MESSAGE = 'Não foi possível conectar ao servidor. Verifique se a API está no ar.';
const UNEXPECTED_ERROR_MESSAGE = 'Ocorreu um erro inesperado. Tente novamente.';

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
            if (error.status === 0) {
                return new ApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE);
            }

            if (isApiErrorResponse(error.error)) {
                const body = error.error.error;

                return new ApiError(error.status, body.code, body.message, body.requestId, body.details ?? []);
            }

            return new ApiError(error.status, `HTTP_${error.status}`, UNEXPECTED_ERROR_MESSAGE);
        }

        return new ApiError(-1, 'UNEXPECTED_ERROR', UNEXPECTED_ERROR_MESSAGE);
    }

    public get isServerError(): boolean {
        return this.status >= 500;
    }
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
