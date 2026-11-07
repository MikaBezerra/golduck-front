/** Corpo de `POST /auth/login` (ver financas/src/modules/auth/dto/auth.dto.ts). */
export interface LoginRequest {
    readonly email: string;
    readonly password: string;
}

/** Resposta de `POST /auth/login` e `POST /auth/refresh`. */
export interface AuthTokens {
    /** JWT de curta duração (15 min) enviado em `Authorization: Bearer ...`. */
    readonly accessToken: string;
    /** Token de longa duração (7 dias) usado só para pedir um novo access token. Troca a cada uso. */
    readonly refreshToken: string;
}

export type Role = 'ADMIN' | 'USER';

/** Resposta de `GET /auth/me`: quem está logado. */
export interface AuthUser {
    readonly id: string;
    readonly email: string;
    readonly role: Role;
}
