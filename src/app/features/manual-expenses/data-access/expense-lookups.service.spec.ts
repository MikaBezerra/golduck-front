import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { aCategory, aPerson } from '../../../../testing/fixtures';
import { notificationsMock, type NotificationsMock } from '../../../../testing/mocks';
import { CategoryService } from '../../categories/data-access/category.service';
import { PersonService } from '../../people/data-access/person.service';
import { ExpenseLookupsService } from './expense-lookups.service';

describe('ExpenseLookupsService', () => {
    let notifications: NotificationsMock;
    const categories = { findAll: vi.fn() };
    const people = { findAll: vi.fn() };

    function setup(): ExpenseLookupsService {
        notifications = notificationsMock();
        TestBed.configureTestingModule({
            providers: [
                ExpenseLookupsService,
                { provide: CategoryService, useValue: categories },
                { provide: PersonService, useValue: people },
                { provide: NotificationService, useValue: notifications },
            ],
        });

        return TestBed.inject(ExpenseLookupsService);
    }

    beforeEach(() => {
        categories.findAll.mockReset();
        people.findAll.mockReset();
    });

    it('carrega categorias e pessoas inclusive inativas, mas só oferece as ativas', () => {
        categories.findAll.mockReturnValue(
            of([
                aCategory({ id: 'c-outros', name: 'Outros', isDefault: true }),
                aCategory({ id: 'c-velha', name: 'Velha', active: false }),
            ]),
        );
        people.findAll.mockReturnValue(of([aPerson({ id: 'p-ana' }), aPerson({ id: 'p-ex', active: false })]));
        const lookups = setup();

        expect(lookups.loaded()).toBe(false);
        lookups.load();

        expect(categories.findAll).toHaveBeenCalledWith(true);
        expect(people.findAll).toHaveBeenCalledWith(true);
        expect(lookups.loaded()).toBe(true);
        expect(lookups.activeCategories().map((category) => category.id)).toEqual(['c-outros']);
        expect(lookups.activePeople().map((person) => person.id)).toEqual(['p-ana']);
        expect(lookups.defaultCategory()?.id).toBe('c-outros');
    });

    it('acha nomes também de categorias e pessoas desativadas (despesas antigas)', () => {
        categories.findAll.mockReturnValue(of([aCategory({ id: 'c-velha', name: 'Velha', active: false })]));
        people.findAll.mockReturnValue(of([aPerson({ id: 'p-ex', name: 'Ex', active: false })]));
        const lookups = setup();

        lookups.load();

        expect(lookups.categoryById().get('c-velha')?.name).toBe('Velha');
        expect(lookups.personById().get('p-ex')?.name).toBe('Ex');
        expect(lookups.defaultCategory()).toBeNull();
    });

    it('avisa o erro e continua sem dados se a busca falhar', () => {
        const error = new Error('falhou');
        categories.findAll.mockReturnValue(throwError(() => error));
        people.findAll.mockReturnValue(of([]));
        const lookups = setup();

        lookups.load();

        expect(notifications.error).toHaveBeenCalledWith(error);
        expect(lookups.loaded()).toBe(false);
        expect(lookups.activeCategories()).toEqual([]);
    });
});
