import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { type ErrorHandler, inject, Injectable, Injector } from '@angular/core';

import { ApiError } from '../api/api-error';
import { newId, supportCode } from '../logging/ids';
import { LoggerService } from '../logging/logger.service';
import { NotificationService } from '../notification/notification.service';

/** Não repete o mesmo aviso se o erro se repetir em sequência (ex.: um erro dentro de um laço). */
const REPEAT_WINDOW_MS = 4000;

/**
 * Destino de todo erro que nenhum código tratou (equivale a um exception filter global do NestJS).
 * Junto com `provideBrowserGlobalErrorListeners()`, pega também erros soltos e promessas rejeitadas.
 *
 * 1. Escreve um log organizado: o que falhou, onde (rota), código de suporte e o erro original.
 * 2. Mostra um aviso amigável, com o mesmo código, para o usuário informar ao suporte.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    private readonly logger = inject(LoggerService);
    private readonly injector = inject(Injector);
    private readonly document = inject(DOCUMENT);
    private lastNotice = { key: '', at: 0 };

    public handleError(error: unknown): void {
        try {
            const cause = unwrap(error);
            const route = this.document.location?.pathname ?? '';

            if (cause instanceof ApiError || cause instanceof HttpErrorResponse) {
                const apiError = ApiError.from(cause);

                this.logger.error(
                    `Erro da API não tratado: ${apiError.code}`,
                    { route, status: apiError.status, code: apiError.code, requestId: apiError.requestId },
                    cause,
                );
                this.notifyOnce(`api:${apiError.code}:${apiError.message}`, (notifications) =>
                    notifications.error(apiError),
                );

                return;
            }

            const code = supportCode(newId());
            const name = cause instanceof Error ? cause.name : typeof cause;
            const message = cause instanceof Error ? cause.message : String(cause);

            this.logger.error(`Erro não tratado: ${message}`, { route, supportCode: code, name }, cause);
            this.notifyOnce(`app:${name}:${message}`, (notifications) => notifications.unexpected(code));
        } catch (handlerError: unknown) {
            // O tratamento de erros nunca pode quebrar: no pior caso, vai direto para o console.
            console.error('Falha ao tratar um erro', handlerError, error);
        }
    }

    private notifyOnce(key: string, show: (notifications: NotificationService) => void): void {
        const now = Date.now();

        if (key === this.lastNotice.key && now - this.lastNotice.at < REPEAT_WINDOW_MS) {
            return;
        }

        this.lastNotice = { key, at: now };
        // Pegado só quando precisa: o ErrorHandler nasce antes de boa parte dos serviços.
        show(this.injector.get(NotificationService));
    }
}

/** Erros embrulhados (promessa rejeitada, erro original do Angular) viram o erro de verdade. */
function unwrap(error: unknown): unknown {
    if (typeof error === 'object' && error !== null) {
        if ('rejection' in error) {
            return (error as { rejection: unknown }).rejection;
        }

        if ('ngOriginalError' in error) {
            return (error as { ngOriginalError: unknown }).ngOriginalError;
        }
    }

    return error;
}
