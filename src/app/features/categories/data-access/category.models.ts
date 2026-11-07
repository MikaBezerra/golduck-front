/** Espelha financas/src/modules/categories/dto/category.dto.ts */

export interface Category {
    readonly id: string;
    readonly name: string;
    readonly active: boolean;
    /** A categoria padrão ("Outros") recebe despesas sem categoria e não pode ser alterada. */
    readonly isDefault: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface CreateCategoryRequest {
    readonly name: string;
}

export interface UpdateCategoryRequest {
    readonly name?: string;
    readonly active?: boolean;
}

/** Limite do back (VARCHAR 120). */
export const CATEGORY_NAME_MAX_LENGTH = 120;
