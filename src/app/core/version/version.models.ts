import type { ApiSchemas } from '../api/api-types';

/**
 * Resposta de `GET /version` (rota pública do back): qual versão da API está no ar.
 * - `commit`: hash curto do commit publicado; `null` quando o back não sabe (ex.: rodando local);
 * - `environment`: ambiente do back (`development`, `develop`, `production`...).
 */
export type ApiVersion = ApiSchemas['VersionResponse'];
