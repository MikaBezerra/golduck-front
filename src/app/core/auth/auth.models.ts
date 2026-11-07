import type { ApiSchemas } from '../api/api-types';

/** Corpo de `POST /auth/login`. */
export type LoginRequest = ApiSchemas['LoginDto'];

/**
 * Resposta de `POST /auth/login` e `POST /auth/refresh`:
 * - `accessToken`: JWT de curta duração (15 min) enviado em `Authorization: Bearer ...`;
 * - o refresh token (longa duração, troca a cada uso) vem num cookie httpOnly que o JavaScript não lê.
 *
 * TODO(transição): o back antigo ainda devolve `refreshToken` no corpo. Quando o back usar o cookie,
 * gere os tipos de novo (`npm run api:types`) e volte para `ApiSchemas['AuthTokensDto']` direto.
 */
export type AuthTokens = Omit<ApiSchemas['AuthTokensDto'], 'refreshToken'> & { readonly refreshToken?: string };

export type Role = ApiSchemas['Role'];

/** Resposta de `GET /auth/me`: quem está logado. */
export type AuthUser = ApiSchemas['AuthUserResponse'];
