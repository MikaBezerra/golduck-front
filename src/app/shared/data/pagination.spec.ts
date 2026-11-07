import {
    DEFAULT_PAGE_SIZE,
    emptyPage,
    firstRowOf,
    MAX_PAGE_SIZE,
    normalizePageQuery,
    pageParams,
    pageQueryFromLazyLoad,
} from './pagination';

describe('pagination', () => {
    it('corrige valores fora dos limites do back', () => {
        expect(normalizePageQuery()).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
        expect(normalizePageQuery({ page: 0, pageSize: 500 })).toEqual({ page: 1, pageSize: MAX_PAGE_SIZE });
        expect(normalizePageQuery({ page: 2.7, pageSize: 0 })).toEqual({ page: 2, pageSize: 1 });
        expect(normalizePageQuery({ page: Number.NaN, pageSize: Number.NaN })).toEqual({
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE,
        });
    });

    it('monta os HttpParams com page, pageSize e só os filtros preenchidos', () => {
        const params = pageParams({ page: 3, pageSize: 50 }, { search: 'ana', active: true, empty: '', none: null });

        expect(params.toString()).toBe('search=ana&active=true&page=3&pageSize=50');
    });

    it('converte o lazy load do p-table em página e volta', () => {
        expect(pageQueryFromLazyLoad({ first: 0, rows: 20 })).toEqual({ page: 1, pageSize: 20 });
        expect(pageQueryFromLazyLoad({ first: 40, rows: 20 })).toEqual({ page: 3, pageSize: 20 });
        expect(pageQueryFromLazyLoad({ first: undefined, rows: undefined }, 10)).toEqual({ page: 1, pageSize: 10 });
        expect(firstRowOf({ page: 3, pageSize: 20 })).toBe(40);
        expect(firstRowOf({ page: 0, pageSize: 20 })).toBe(0);
    });

    it('cria uma página vazia', () => {
        expect(emptyPage({ pageSize: 10 })).toEqual({ items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 });
    });
});
