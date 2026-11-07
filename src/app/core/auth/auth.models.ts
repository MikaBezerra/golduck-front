import type { ApiSchemas } from '../api/api-types';

/** Corpo de `POST /auth/login`. */
export type LoginRequest = ApiSchemas['LoginDto'];

/**
 * Resposta de `POST /auth/login` e `POST /auth/refresh`:
 * - `accessToken`: JWT de curta duração (15 min) enviado em `Authorization: Bearer ...`;
 * - `refreshToken`: longa duração (7 dias), usado só para pedir um novo access token. Troca a cada uso.
 */
export type AuthTokens = ApiSchemas['AuthTokensDto'];

export type Role = ApiSchemas['Role'];

/** Resposta de `GET /auth/me`: quem está logado. */
export type AuthUser = ApiSchemas['AuthUserResponse'];
