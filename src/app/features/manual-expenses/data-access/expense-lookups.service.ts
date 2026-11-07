import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import type { Category } from '../../categories/data-access/category.models';
import { CategoryService } from '../../categories/data-access/category.service';
import type { Person } from '../../people/data-access/person.models';
import { PersonService } from '../../people/data-access/person.service';

/**
 * Categorias e pessoas que as telas de despesas precisam para mostrar nomes e preencher os seletores.
 *
 * Carrega TODAS (inclusive desativadas, com `?includeInactive=true`): despesas antigas podem
 * apontar para uma categoria ou pessoa desativada depois, e o nome dela continua aparecendo.
 * Nos seletores entram só as ativas.
 *
 * Não é `providedIn: 'root'`: cada página de despesas cria a sua instância (ver `providers`
 * no componente), e os dados somem quando o usuário sai da tela.
 */
@Injectable()
export class ExpenseLookupsService {
    private readonly categoryService = inject(CategoryService);
    private readonly personService = inject(PersonService);
    private readonly notifications = inject(NotificationService);

    private readonly allCategories = signal<Category[]>([]);
    private readonly allPeople = signal<Person[]>([]);

    public readonly loaded = signal(false);

    /** Podem ser escolhidas em novas despesas. */
    public readonly activeCategories = computed(() => this.allCategories().filter((category) => category.active));
    public readonly activePeople = computed(() => this.allPeople().filter((person) => person.active));

    public readonly defaultCategory = computed(
        () => this.activeCategories().find((category) => category.isDefault) ?? null,
    );
    public readonly categoryById = computed(
        () => new Map(this.allCategories().map((category) => [category.id, category])),
    );
    public readonly personById = computed(() => new Map(this.allPeople().map((person) => [person.id, person])));

    public load(): void {
        forkJoin([this.categoryService.findAll(true), this.personService.findAll(true)]).subscribe({
            next: ([categories, people]) => {
                this.allCategories.set(categories);
                this.allPeople.set(people);
                this.loaded.set(true);
            },
            error: (error: unknown) => this.notifications.error(error),
        });
    }
}
