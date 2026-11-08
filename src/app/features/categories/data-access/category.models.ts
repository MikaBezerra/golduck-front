import type { ApiSchemas } from '../../../core/api/api-types';

/**
 * Categoria das compras do cartão (as despesas fora do cartão não têm categoria). A categoria
 * padrão ("Outros", `isDefault`) recebe as compras sem categoria e não pode ser alterada nem excluída.
 */
export type Category = ApiSchemas['CategoryResponse'];

export type CreateCategoryRequest = ApiSchemas['CreateCategoryDto'];

export type UpdateCategoryRequest = ApiSchemas['UpdateCategoryDto'];

/** Resultado da exclusão: para qual categoria (a padrão) foram as compras do cartão e quantas. */
export type DeleteCategoryResult = ApiSchemas['DeleteCategoryResponse'];

/** Frase do aviso depois de excluir: quantas compras do cartão foram para a categoria padrão. */
export function describeMovedPurchases(result: DeleteCategoryResult): string {
    const moved = result.movedCardExpenses;

    if (moved === 0) {
        return 'Nenhuma compra do cartão usava essa categoria.';
    }

    const count = moved === 1 ? '1 compra do cartão foi' : `${moved} compras do cartão foram`;

    return `${count} para "${result.movedTo.name}".`;
}

/** Limite do back (VARCHAR 120). */
export const CATEGORY_NAME_MAX_LENGTH = 120;
