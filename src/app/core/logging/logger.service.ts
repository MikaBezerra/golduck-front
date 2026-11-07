import { inject, Injectable, InjectionToken } from '@angular/core';

import { environment } from '../../../environments/environment';
import type { LogLevel } from '../../../environments/environment.model';

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const BADGE: Record<LogLevel, string> = {
    debug: 'background:#36495a;color:#eef4f8',
    info: 'background:#0297de;color:#02070a',
    warn: 'background:#eda100;color:#02070a',
    error: 'background:#e34948;color:#ffffff',
};

/** Nível mínimo dos logs. Vem do arquivo de ambiente; nos testes dá para trocar pelo provider. */
export const LOG_LEVEL = new InjectionToken<LogLevel>('LOG_LEVEL', {
    providedIn: 'root',
    factory: () => environment.logLevel,
});

/** Dados extras do log (aparecem como um objeto que dá para abrir no console). */
export type LogContext = Readonly<Record<string, unknown>>;

/**
 * Logger da aplicação, com níveis (como o `Logger` do NestJS). Em desenvolvimento mostra tudo;
 * em produção só avisos e erros. Sem ferramenta externa: tudo vai para o console do navegador,
 * com hora, nível destacado, mensagem e, quando houver, os dados e o erro original (com a pilha).
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
    private readonly minimum = ORDER[inject(LOG_LEVEL)];

    public debug(message: string, context?: LogContext): void {
        this.write('debug', message, context);
    }

    public info(message: string, context?: LogContext): void {
        this.write('info', message, context);
    }

    public warn(message: string, context?: LogContext, error?: unknown): void {
        this.write('warn', message, context, error);
    }

    public error(message: string, context?: LogContext, error?: unknown): void {
        this.write('error', message, context, error);
    }

    public isEnabled(level: LogLevel): boolean {
        return ORDER[level] >= this.minimum;
    }

    private write(level: LogLevel, message: string, context?: LogContext, error?: unknown): void {
        if (!this.isEnabled(level)) {
            return;
        }

        const extras: unknown[] = [];

        if (context && Object.keys(context).length > 0) {
            extras.push(context);
        }

        if (error !== undefined) {
            extras.push(error);
        }

        // eslint-disable-next-line no-console -- o console é o destino dos logs.
        console[level](`%c ${level.toUpperCase()} %c ${time()} ${message}`, BADGE[level], '', ...extras);
    }
}

function time(): string {
    return new Date().toLocaleTimeString('pt-BR', { hour12: false });
}
