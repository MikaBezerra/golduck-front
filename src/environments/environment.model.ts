/**
 * Configuração que muda de um ambiente para outro (como as variáveis de ambiente do back,
 * só que escolhidas na hora do build).
 *
 * Tudo o que está aqui vai para o bundle do navegador e é público: nunca coloque segredos.
 */
export interface Environment {
    /** Endereço base da API, sem barra no fim (`/api` ou `https://.../api`). */
    readonly apiBaseUrl: string;
    /** Nível mínimo dos logs no console: `debug` mostra tudo; `warn` só avisos e erros. */
    readonly logLevel: LogLevel;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
