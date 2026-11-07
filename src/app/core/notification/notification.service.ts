import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

import { ApiError } from '../api/api-error';

/**
 * Avisos rápidos no canto da tela (toasts).
 * Centraliza o visual e o texto para todas as telas falarem do mesmo jeito.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly messages = inject(MessageService);

    public success(message: string): void {
        this.messages.add({ severity: 'success', summary: 'Tudo certo', detail: message, life: 3500 });
    }

    public info(message: string): void {
        this.messages.add({ severity: 'info', summary: 'Aviso', detail: message, life: 4000 });
    }

    /** Mostra a mensagem que veio do back (já em pt-BR). Erros 5xx levam o id da requisição para facilitar o suporte. */
    public error(error: unknown): void {
        const apiError = ApiError.from(error);
        const detail =
            apiError.isServerError && apiError.requestId
                ? `${apiError.message} (código: ${apiError.requestId})`
                : apiError.message;

        this.messages.add({ severity: 'error', summary: 'Não foi possível concluir', detail, life: 6000 });
    }
}
