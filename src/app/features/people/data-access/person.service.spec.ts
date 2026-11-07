import type { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { aPerson } from '../../../../testing/fixtures';
import { expectApiCall, queryOf, respondData, setupHttpTesting } from '../../../../testing/http-testing';
import { PersonService } from './person.service';

describe('PersonService (contrato com /api/people)', () => {
    let http: HttpTestingController;
    let service: PersonService;

    beforeEach(() => {
        http = setupHttpTesting();
        service = TestBed.inject(PersonService);
    });

    afterEach(() => http.verify());

    it('lista só as ativas por padrão, sem query', async () => {
        const result = firstValueFrom(service.findAll());
        const request = expectApiCall(http, 'GET', 'people');

        expect(queryOf(request)).toEqual({});
        respondData(request, [aPerson()]);

        await expect(result).resolves.toEqual([aPerson()]);
    });

    it('pede as inativas com includeInactive=true', async () => {
        const result = firstValueFrom(service.findAll(true));
        const request = expectApiCall(http, 'GET', 'people');

        expect(queryOf(request)).toEqual({ includeInactive: 'true' });
        respondData(request, []);

        await expect(result).resolves.toEqual([]);
    });

    it('busca uma pessoa pelo id', async () => {
        const result = firstValueFrom(service.findById('person-9'));
        respondData(expectApiCall(http, 'GET', 'people/person-9'), aPerson({ id: 'person-9' }));

        await expect(result).resolves.toMatchObject({ id: 'person-9' });
    });

    it('cria com POST e o corpo do formulário', async () => {
        const body = { name: 'Bruno', email: 'bruno@exemplo.com', phone: null };
        const result = firstValueFrom(service.create(body));
        const request = expectApiCall(http, 'POST', 'people');

        expect(request.request.body).toEqual(body);
        respondData(request, aPerson({ name: 'Bruno' }));

        await expect(result).resolves.toMatchObject({ name: 'Bruno' });
    });

    it('altera com PATCH só os campos enviados (ex.: desativar)', async () => {
        const result = firstValueFrom(service.update('person-1', { active: false }));
        const request = expectApiCall(http, 'PATCH', 'people/person-1');

        expect(request.request.body).toEqual({ active: false });
        respondData(request, aPerson({ active: false }));

        await expect(result).resolves.toMatchObject({ active: false });
    });
});
