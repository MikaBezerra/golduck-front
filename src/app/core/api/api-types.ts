import type { components } from './api-schema';

/**
 * Tipos de todas as entradas e saídas da API, gerados a partir do OpenAPI do back
 * (`api-schema.d.ts`, criado por `npm run api:types`).
 *
 * Os `*.models.ts` de cada feature dão nomes curtos a estes tipos, ex.:
 * `export type Category = ApiSchemas['CategoryResponse'];`
 * Assim, se o back mudar um campo, o front deixa de compilar onde usa o campo antigo.
 */
export type ApiSchemas = components['schemas'];
