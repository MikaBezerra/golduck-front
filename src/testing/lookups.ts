import { computed, signal } from '@angular/core';

import type { Category } from '../app/features/categories/data-access/category.models';
import type { Person } from '../app/features/people/data-access/person.models';

/**
 * Dublê do `ExpenseLookupsService` (categorias e pessoas das telas de despesas), com os mesmos
 * signals e regras: só as ativas nos seletores, mas os nomes de todas disponíveis.
 */
export function lookupsWith(categories: Category[], people: Person[]) {
    const allCategories = signal(categories);
    const allPeople = signal(people);

    return {
        loaded: signal(true),
        load: () => undefined,
        activeCategories: computed(() => allCategories().filter((category) => category.active)),
        activePeople: computed(() => allPeople().filter((person) => person.active)),
        defaultCategory: computed(() => allCategories().find((category) => category.isDefault) ?? null),
        categoryById: computed(() => new Map(allCategories().map((category) => [category.id, category]))),
        personById: computed(() => new Map(allPeople().map((person) => [person.id, person]))),
    };
}
