import type { ApiSchemas } from '../../../core/api/api-types';

/** Pessoa da casa. O celular vem no formato internacional, ex.: `+5511999999999`. */
export type Person = ApiSchemas['PersonResponse'];

export type CreatePersonRequest = ApiSchemas['CreatePersonDto'];

export type UpdatePersonRequest = ApiSchemas['UpdatePersonDto'];

/** Limites do back (VARCHAR). */
export const PERSON_NAME_MAX_LENGTH = 120;
export const PERSON_EMAIL_MAX_LENGTH = 254;
