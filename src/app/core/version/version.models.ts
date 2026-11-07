/**
 * Resposta de `GET /version` (rota pública do back): qual versão da API está no ar.
 *
 * TODO: o endpoint é novo no back. Depois de gerar os tipos (`npm run api:types`), troque por
 * `export type ApiVersion = ApiSchemas['<nome do DTO de versão>']`.
 */
export interface ApiVersion {
    readonly name: string;
    readonly version: string;
    /** Hash do commit publicado; `null` quando o back não sabe (ex.: rodando local). */
    readonly commit: string | null;
    /** Ambiente do back (`development`, `develop`, `production`...). */
    readonly environment: string;
}
