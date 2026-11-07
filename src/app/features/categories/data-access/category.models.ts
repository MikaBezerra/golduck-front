import type { ApiSchemas } from '../../../core/api/api-types';

/**
 * Categoria de despesa. A categoria padrão ("Outros", `isDefault`) recebe despesas
 * sem categoria e não pode ser alterada.
 */
export type Category = ApiSchemas['CategoryResponse'];

export type CreateCategoryRequest = ApiSchemas['CreateCategoryDto'];

export type UpdateCategoryRequest = ApiSchemas['UpdateCategoryDto'];

/** Limite do back (VARCHAR 120). */
export const CATEGORY_NAME_MAX_LENGTH = 120;
