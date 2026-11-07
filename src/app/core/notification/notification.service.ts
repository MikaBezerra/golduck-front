import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

import { ApiError } from '../api/api-error';
import { LoggerService } from '../logging/logger.service';

/**
 * Avisos rápidos no canto da tela (toasts).
 * Centraliza o visual e o texto para todas as telas falarem do mesmo jeito.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly messages = inject(MessageService);
    private readonly logger = inject(LoggerService);

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

    /**
     * Mostra a mensagem que veio do back (já em pt-BR) com o código de suporte (início do id da
     * requisição) e registra o erro no log com o id completo, para achar a mesma requisição no back.
     */
    public error(error: unknown): void {
        const apiError = ApiError.from(error);
        const context = { status: apiError.status, code: apiError.code, requestId: apiError.requestId };

        // Erros do servidor e de rede merecem atenção; os de regra de negócio (4xx) são só aviso.
        if (apiError.isServerError || apiError.status <= 0) {
            this.logger.error(`Erro da API: ${apiError.message}`, context);
        } else {
            this.logger.warn(`Erro da API: ${apiError.message}`, context);
        }

        // 401: o fluxo de sessão já avisou ("Sua sessão expirou") e levou para o login.
        if (apiError.status === 401) {
            return;
        }

        this.messages.add({
            severity: 'error',
            summary: 'Não foi possível concluir',
            detail: apiError.userMessage,
            life: 6000,
        });
    }
}
