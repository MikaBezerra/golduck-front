import { inject, Injectable, signal } from '@angular/core';

import { ApiService } from '../api/api.service';
import { LoggerService } from '../logging/logger.service';
import { APP_VERSION } from './app-version';
import type { ApiVersion } from './version.models';

/**
 * Versões do front e da API, para mostrar num canto discreto da tela (rodapé) e ajudar no suporte:
 * "estou na v1.2.0 do front e na 0.9.1 da API".
 */
@Injectable({ providedIn: 'root' })
export class VersionService {
    private readonly api = inject(ApiService);
    private readonly logger = inject(LoggerService);
    private readonly apiVersionState = signal<ApiVersion | null>(null);
    private requested = false;

    public readonly appVersion = APP_VERSION;
    /** Versão da API (`GET /version`); `null` até responder ou se a API não informar. */
    public readonly apiVersion = this.apiVersionState.asReadonly();

    /** Busca a versão da API uma vez só (chamadas seguintes não fazem nada). */
    public load(): void {
        if (this.requested) {
            return;
        }

        this.requested = true;
        this.api.get<ApiVersion>('version').subscribe({
            next: (version) => {
                this.apiVersionState.set(version);
                this.logger.debug(`Front v${this.appVersion} · API v${version.version}`, { ...version });
            },
            // Só informação de tela: sem aviso ao usuário.
            error: (error: unknown) => this.logger.debug('Não foi possível ler a versão da API', { error }),
        });
    }
}
