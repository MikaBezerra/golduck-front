/** Espelha financas/src/modules/people/dto/person.dto.ts e o model Person do Prisma. */

export interface Person {
    readonly id: string;
    readonly name: string;
    readonly email: string | null;
    /** Formato internacional, ex.: `+5511999999999`. */
    readonly phone: string | null;
    readonly active: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface CreatePersonRequest {
    readonly name: string;
    readonly email?: string | null;
    readonly phone?: string | null;
}

export interface UpdatePersonRequest {
    readonly name?: string;
    readonly email?: string | null;
    readonly phone?: string | null;
    readonly active?: boolean;
}

/** Limites do back (VARCHAR). */
export const PERSON_NAME_MAX_LENGTH = 120;
export const PERSON_EMAIL_MAX_LENGTH = 254;
