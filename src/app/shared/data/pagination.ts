import { HttpParams } from '@angular/common/http';
import type { TableLazyLoadEvent } from 'primeng/table';

import type { QueryParams } from '../../core/api/api.types';

/*
 * Paginação no padrão do back: query `page` (≥ 1) e `pageSize` (1 a 100) e resposta
 * `{ items, page, pageSize, total, totalPages }` (dentro do envelope `{ data }`).
 *
 * Uso num service:
 *   findPage(query: PageQuery, filters?: QueryParams): Observable<Page<Category>> {
 *       return this.api.get<Page<Category>>('categories', pageParams(query, filters));
 *   }
 *
 * Uso numa tabela do PrimeNG com carregamento sob demanda (`[lazy]="true"`):
 *   (onLazyLoad)="query.set(pageQueryFromLazyLoad($event))"
 *   [first]="firstRowOf(page)" [rows]="page.pageSize" [totalRecords]="page.total"
 */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Qual página pedir (`page` começa em 1). */
export interface PageQuery {
    readonly page: number;
    readonly pageSize: number;
}

/** Uma página de resultados, como o back devolve. */
export interface Page<T> {
    readonly items: readonly T[];
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
    readonly totalPages: number;
}

/** Corrige valores fora dos limites do back (página < 1, tamanho fora de 1–100, números quebrados). */
export function normalizePageQuery(query: Partial<PageQuery> = {}): PageQuery {
    const page = Math.trunc(query.page ?? 1);
    const pageSize = Math.trunc(query.pageSize ?? DEFAULT_PAGE_SIZE);

    return {
        page: Number.isFinite(page) && page >= 1 ? page : 1,
        pageSize: Number.isFinite(pageSize) ? Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize)) : DEFAULT_PAGE_SIZE,
    };
}

/** `page` e `pageSize` (já corrigidos) mais os filtros, sem os filtros vazios. */
export function pageParams(query: Partial<PageQuery>, filters: QueryParams = {}): HttpParams {
    const { page, pageSize } = normalizePageQuery(query);
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
            params = params.set(key, String(value));
        }
    }

    return params.set('page', page).set('pageSize', pageSize);
}

/** Evento do `p-table` (posição `first` e tamanho `rows`) → página pedida ao back. */
export function pageQueryFromLazyLoad(
    event: Pick<TableLazyLoadEvent, 'first' | 'rows'>,
    fallbackPageSize = DEFAULT_PAGE_SIZE,
): PageQuery {
    const pageSize = normalizePageQuery({ pageSize: event.rows ?? fallbackPageSize }).pageSize;
    const first = Math.max(0, event.first ?? 0);

    return { page: Math.floor(first / pageSize) + 1, pageSize };
}

/** Página → posição da primeira linha no `p-table` (`[first]`). */
export function firstRowOf(query: Pick<PageQuery, 'page' | 'pageSize'>): number {
    return (Math.max(1, query.page) - 1) * query.pageSize;
}

/** Página vazia, para o valor inicial de uma tela antes da primeira resposta. */
export function emptyPage<T>(query: Partial<PageQuery> = {}): Page<T> {
    const { page, pageSize } = normalizePageQuery(query);

    return { items: [], page, pageSize, total: 0, totalPages: 0 };
}
