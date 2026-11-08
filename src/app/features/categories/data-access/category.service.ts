import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import type { Category, CreateCategoryRequest, DeleteCategoryResult, UpdateCategoryRequest } from './category.models';

/** Chamadas HTTP de `/categories` (ver `categories/controller` no back). */
@Injectable({ providedIn: 'root' })
export class CategoryService {
    private readonly api = inject(ApiService);

    /** Categorias em ordem alfabética. Com `includeInactive`, traz também as desativadas (ativas primeiro). */
    public findAll(includeInactive = false): Observable<Category[]> {
        return this.api.get<Category[]>('categories', includeInactive ? { includeInactive } : undefined);
    }

    /** Busca qualquer categoria, inclusive inativa. */
    public findById(id: string): Observable<Category> {
        return this.api.get<Category>(`categories/${id}`);
    }

    public create(body: CreateCategoryRequest): Observable<Category> {
        return this.api.post<Category>('categories', body);
    }

    public update(id: string, body: UpdateCategoryRequest): Observable<Category> {
        return this.api.patch<Category>(`categories/${id}`, body);
    }

    /**
     * Exclui a categoria: as despesas e compras do cartão dela vão para a padrão ("Outros"),
     * que não pode ser excluída (`409 CATEGORY_DEFAULT_PROTECTED`).
     */
    public delete(id: string): Observable<DeleteCategoryResult> {
        return this.api.delete<DeleteCategoryResult>(`categories/${id}`);
    }
}
