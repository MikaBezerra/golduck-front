import type { Signal, Type } from '@angular/core';
import { of, throwError } from 'rxjs';

import { ConfirmService } from '../core/notification/confirm.service';
import { NotificationService } from '../core/notification/notification.service';
import { internals, renderComponent } from '../../testing/components';
import { aCategory, aCreditCard, aPerson } from '../../testing/fixtures';
import { confirmMock, type ConfirmMock, notificationsMock, type NotificationsMock } from '../../testing/mocks';
import { CategoryService } from './categories/data-access/category.service';
import { CategoriesPageComponent } from './categories/pages/categories-page.component';
import { CreditCardService } from './credit-cards/data-access/credit-card.service';
import { CreditCardsPageComponent } from './credit-cards/pages/credit-cards-page.component';
import { PersonService } from './people/data-access/person.service';
import { PeoplePageComponent } from './people/pages/people-page.component';

/*
 * As telas de cadastro (pessoas, categorias e cartões) seguem o mesmo padrão: listar, mostrar as
 * inativas, desativar depois de confirmar e reativar. Um bloco de testes por tela.
 */

interface RegistryCase {
    readonly name: string;
    readonly page: Type<unknown>;
    readonly service: Type<unknown>;
    readonly item: { id: string; name: string };
    /** Sinal com a lista exibida. */
    readonly listOf: (page: unknown) => Signal<unknown[]>;
    readonly deactivatedMessage: string;
    /** Telas que têm "Mostrar inativas" e "Reativar". */
    readonly reactivation?: { readonly message: string };
}

const CASES: RegistryCase[] = [
    {
        name: 'Pessoas',
        page: PeoplePageComponent,
        service: PersonService,
        item: aPerson({ id: 'person-1', name: 'Ana' }),
        listOf: (page) => (page as { people: Signal<unknown[]> }).people,
        deactivatedMessage: '"Ana" foi desativada.',
        reactivation: { message: '"Ana" foi reativada.' },
    },
    {
        name: 'Categorias',
        page: CategoriesPageComponent,
        service: CategoryService,
        item: aCategory({ id: 'category-1', name: 'Mercado' }),
        listOf: (page) => (page as { categories: Signal<unknown[]> }).categories,
        deactivatedMessage: 'Categoria "Mercado" desativada.',
        reactivation: { message: 'Categoria "Mercado" reativada.' },
    },
    {
        name: 'Cartões',
        page: CreditCardsPageComponent,
        service: CreditCardService,
        item: aCreditCard({ id: 'card-1', name: 'Nubank roxinho' }),
        listOf: (page) => (page as { cards: Signal<unknown[]> }).cards,
        deactivatedMessage: 'Cartão "Nubank roxinho" desativado.',
    },
];

interface PageInternals {
    readonly loading: Signal<boolean>;
    load(): void;
    toggleInactive?(show: boolean): void;
    deactivate(item: unknown): Promise<void>;
    reactivate?(item: unknown): void;
}

describe.each(CASES)('tela de $name', (registry) => {
    let service: { findAll: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    let notifications: NotificationsMock;
    let confirm: ConfirmMock;

    function render(confirmAnswer = true) {
        service = { findAll: vi.fn(() => of([registry.item])), update: vi.fn(() => of(registry.item)) };
        notifications = notificationsMock();
        confirm = confirmMock(confirmAnswer);

        const fixture = renderComponent(registry.page, {}, [
            { provide: registry.service, useValue: service },
            { provide: NotificationService, useValue: notifications },
            { provide: ConfirmService, useValue: confirm },
        ]);

        return { page: internals<PageInternals>(fixture), instance: fixture.componentInstance };
    }

    it('carrega a lista ao abrir', () => {
        const { page, instance } = render();

        expect(service.findAll).toHaveBeenCalledTimes(1);
        expect(registry.listOf(instance)()).toEqual([registry.item]);
        expect(page.loading()).toBe(false);
    });

    it('avisa o erro se a lista não carregar', () => {
        const { page } = render();
        const error = new Error('falhou');
        service.findAll.mockReturnValue(throwError(() => error));

        page.load();

        expect(notifications.error).toHaveBeenCalledWith(error);
        expect(page.loading()).toBe(false);
    });

    it('desativa depois de confirmar, avisa e recarrega', async () => {
        const { page } = render();

        await page.deactivate(registry.item);

        expect(confirm.danger).toHaveBeenCalledWith(expect.objectContaining({ acceptLabel: 'Desativar' }));
        expect(service.update).toHaveBeenCalledWith(registry.item.id, { active: false });
        expect(notifications.success).toHaveBeenCalledWith(registry.deactivatedMessage);
        expect(service.findAll).toHaveBeenCalledTimes(2);
    });

    it('não desativa se o usuário cancelar', async () => {
        const { page } = render(false);

        await page.deactivate(registry.item);

        expect(service.update).not.toHaveBeenCalled();
    });

    if (registry.reactivation) {
        const reactivation = registry.reactivation;

        it('mostra as inativas pedindo includeInactive e reativa', () => {
            const { page } = render();

            page.toggleInactive?.(true);
            expect(service.findAll).toHaveBeenLastCalledWith(true);

            page.reactivate?.(registry.item);
            expect(service.update).toHaveBeenCalledWith(registry.item.id, { active: true });
            expect(notifications.success).toHaveBeenCalledWith(reactivation.message);
        });
    }
});
