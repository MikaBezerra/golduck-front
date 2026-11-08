import type { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { aCategory } from '../../../../testing/fixtures';
import { expectApiCall, queryOf, respondData, setupHttpTesting } from '../../../../testing/http-testing';
import { CategoryService } from './category.service';

describe('CategoryService (contrato com /api/categories)', () => {
    let http: HttpTestingController;
    let service: CategoryService;

    beforeEach(() => {
        http = setupHttpTesting();
        service = TestBed.inject(CategoryService);
    });

    afterEach(() => http.verify());

    it('lista só as ativas por padrão e todas com includeInactive', async () => {
        const active = firstValueFrom(service.findAll());
        const activeRequest = expectApiCall(http, 'GET', 'categories');
        expect(queryOf(activeRequest)).toEqual({});
        respondData(activeRequest, [aCategory()]);
        await expect(active).resolves.toHaveLength(1);

        const all = firstValueFrom(service.findAll(true));
        const allRequest = expectApiCall(http, 'GET', 'categories');
        expect(queryOf(allRequest)).toEqual({ includeInactive: 'true' });
        respondData(allRequest, [aCategory(), aCategory({ id: 'category-2', active: false })]);
        await expect(all).resolves.toHaveLength(2);
    });

    it('busca, cria e renomeia nas rotas certas', async () => {
        const found = firstValueFrom(service.findById('category-3'));
        respondData(expectApiCall(http, 'GET', 'categories/category-3'), aCategory({ id: 'category-3' }));
        await expect(found).resolves.toMatchObject({ id: 'category-3' });

        const created = firstValueFrom(service.create({ name: 'Farmácia' }));
        const createRequest = expectApiCall(http, 'POST', 'categories');
        expect(createRequest.request.body).toEqual({ name: 'Farmácia' });
        respondData(createRequest, aCategory({ name: 'Farmácia' }));
        await expect(created).resolves.toMatchObject({ name: 'Farmácia' });

        const renamed = firstValueFrom(service.update('category-1', { name: 'Feira' }));
        const updateRequest = expectApiCall(http, 'PATCH', 'categories/category-1');
        expect(updateRequest.request.body).toEqual({ name: 'Feira' });
        respondData(updateRequest, aCategory({ name: 'Feira' }));
        await expect(renamed).resolves.toMatchObject({ name: 'Feira' });
    });

    it('exclui com DELETE e recebe para onde foram as despesas', async () => {
        const moved = {
            movedTo: aCategory({ id: 'outros', name: 'Outros', isDefault: true }),
            movedManualExpenses: 2,
            movedCardExpenses: 1,
        };
        const result = firstValueFrom(service.delete('category-1'));

        respondData(expectApiCall(http, 'DELETE', 'categories/category-1'), moved);

        await expect(result).resolves.toEqual(moved);
    });
});
