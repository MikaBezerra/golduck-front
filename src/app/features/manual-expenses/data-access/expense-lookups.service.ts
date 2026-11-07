import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import type { Category } from '../../categories/data-access/category.models';
import { CategoryService } from '../../categories/data-access/category.service';
import type { Person } from '../../people/data-access/person.models';
import { PersonService } from '../../people/data-access/person.service';

/** O que é preciso de uma despesa (manual ou do cartão) para achar os nomes. */
export interface ExpenseReferences {
    readonly categoryId: string;
    readonly personId: string | null;
}

/**
 * Categorias e pessoas que a tela de despesas precisa para mostrar nomes e preencher os seletores.
 *
 * O back só lista as ATIVAS. Uma despesa antiga pode apontar para uma categoria ou pessoa
 * desativada depois; essas são buscadas uma a uma pelo id, só para exibir o nome.
 *
 * Não é `providedIn: 'root'`: cada página de despesas cria a sua instância (ver `providers`
 * no componente), e os dados somem quando o usuário sai da tela.
 */
@Injectable()
export class ExpenseLookupsService {
    private readonly categoryService = inject(CategoryService);
    private readonly personService = inject(PersonService);
    private readonly notifications = inject(NotificationService);

    private readonly inactiveCategories = signal<Category[]>([]);
    private readonly inactivePeople = signal<Person[]>([]);
    private readonly requestedIds = new Set<string>();

    /** Podem ser escolhidas em novas despesas. */
    public readonly activeCategories = signal<Category[]>([]);
    public readonly activePeople = signal<Person[]>([]);
    public readonly loaded = signal(false);

    public readonly defaultCategory = computed(
        () => this.activeCategories().find((category) => category.isDefault) ?? null,
    );
    public readonly categoryById = computed(
        () =>
            new Map(
                [...this.activeCategories(), ...this.inactiveCategories()].map((category) => [category.id, category]),
            ),
    );
    public readonly personById = computed(
        () => new Map([...this.activePeople(), ...this.inactivePeople()].map((person) => [person.id, person])),
    );

    public load(): void {
        forkJoin([this.categoryService.findAll(), this.personService.findAll()]).subscribe({
            next: ([categories, people]) => {
                this.activeCategories.set(categories);
                this.activePeople.set(people);
                this.loaded.set(true);
            },
            error: (error: unknown) => this.notifications.error(error),
        });
    }

    /** Busca as categorias/pessoas inativas usadas por estas despesas, se ainda não conhecidas. */
    public ensureNames(expenses: readonly ExpenseReferences[]): void {
        if (!this.loaded()) {
            return;
        }

        const categoryIds = this.unknownIds(
            expenses.map((expense) => expense.categoryId),
            this.categoryById(),
        );
        const personIds = this.unknownIds(
            expenses.map((expense) => expense.personId),
            this.personById(),
        );

        if (categoryIds.length > 0) {
            forkJoin(categoryIds.map((id) => this.categoryService.findById(id))).subscribe({
                next: (categories) => this.inactiveCategories.update((current) => [...current, ...categories]),
                error: (error: unknown) => this.notifications.error(error),
            });
        }

        if (personIds.length > 0) {
            forkJoin(personIds.map((id) => this.personService.findById(id))).subscribe({
                next: (people) => this.inactivePeople.update((current) => [...current, ...people]),
                error: (error: unknown) => this.notifications.error(error),
            });
        }
    }

    private unknownIds(ids: readonly (string | null)[], known: ReadonlyMap<string, unknown>): string[] {
        const unknown = [...new Set(ids)].filter(
            (id): id is string => id !== null && !known.has(id) && !this.requestedIds.has(id),
        );

        unknown.forEach((id) => this.requestedIds.add(id));

        return unknown;
    }
}
