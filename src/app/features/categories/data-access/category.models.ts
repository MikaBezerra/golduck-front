import type { ApiSchemas } from '../../../core/api/api-types';

/**
 * Categoria de despesa. A categoria padrão ("Outros", `isDefault`) recebe despesas
 * sem categoria e não pode ser alterada nem excluída.
 */
export type Category = ApiSchemas['CategoryResponse'];

export type CreateCategoryRequest = ApiSchemas['CreateCategoryDto'];

export type UpdateCategoryRequest = ApiSchemas['UpdateCategoryDto'];

/** Resultado da exclusão: para qual categoria (a padrão) foram as despesas e quantas. */
export type DeleteCategoryResult = ApiSchemas['DeleteCategoryResponse'];

/** Frase do aviso depois de excluir: quantas despesas foram para a categoria padrão. */
export function describeMovedExpenses(result: DeleteCategoryResult): string {
    const moved = result.movedManualExpenses + result.movedCardExpenses;

    if (moved === 0) {
        return 'Nenhuma despesa usava essa categoria.';
    }

    const count = moved === 1 ? '1 despesa foi' : `${moved} despesas foram`;

    return `${count} para "${result.movedTo.name}".`;
}

/** Limite do back (VARCHAR 120). */
export const CATEGORY_NAME_MAX_LENGTH = 120;
