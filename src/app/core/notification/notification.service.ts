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

    /** Erro inesperado do próprio front (não veio da API): mensagem amigável e o código para o suporte. */
    public unexpected(code: string): void {
        this.messages.add({
            severity: 'error',
            summary: 'Algo deu errado',
            detail: `Tente de novo. Se continuar, recarregue a página. Código de suporte: ${code}`,
            life: 8000,
        });
    }

    /** Mostra a mensagem que veio do back (já em pt-BR). Erros 5xx levam o id da requisição para facilitar o suporte. */
    public error(error: unknown): void {
        const apiError = ApiError.from(error);

        // 401: o fluxo de sessão já avisou ("Sua sessão expirou") e levou para o login.
        if (apiError.status === 401) {
            return;
        }

        const detail =
            apiError.isServerError && apiError.requestId
                ? `${apiError.message} (código: ${apiError.requestId})`
                : apiError.message;

        this.messages.add({ severity: 'error', summary: 'Não foi possível concluir', detail, life: 6000 });
    }
}
