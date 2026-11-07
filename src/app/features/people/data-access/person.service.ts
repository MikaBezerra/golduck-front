import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import type { CreatePersonRequest, Person, UpdatePersonRequest } from './person.models';

/** Chamadas HTTP de `/people` (ver financas/src/modules/people/controller). */
@Injectable({ providedIn: 'root' })
export class PersonService {
    private readonly api = inject(ApiService);

    /** Somente pessoas ativas, em ordem alfabética. */
    public findAll(): Observable<Person[]> {
        return this.api.get<Person[]>('people');
    }

    /** Busca qualquer pessoa, inclusive inativa. */
    public findById(id: string): Observable<Person> {
        return this.api.get<Person>(`people/${id}`);
    }

    public create(body: CreatePersonRequest): Observable<Person> {
        return this.api.post<Person>('people', body);
    }

    public update(id: string, body: UpdatePersonRequest): Observable<Person> {
        return this.api.patch<Person>(`people/${id}`, body);
    }
}
