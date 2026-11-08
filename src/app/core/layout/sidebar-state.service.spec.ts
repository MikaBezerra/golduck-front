import { TestBed } from '@angular/core/testing';

import { SidebarStateService } from './sidebar-state.service';

const STORAGE_KEY = 'golduck.sidebarCollapsed';

describe('SidebarStateService', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    function create(): SidebarStateService {
        return TestBed.inject(SidebarStateService);
    }

    it('começa com o menu aberto', () => {
        expect(create().collapsed()).toBe(false);
    });

    it('recolhe e abre de novo, lembrando a escolha no navegador', () => {
        const sidebar = create();

        sidebar.toggle();
        expect(sidebar.collapsed()).toBe(true);
        expect(localStorage.getItem(STORAGE_KEY)).toBe('1');

        sidebar.toggle();
        expect(sidebar.collapsed()).toBe(false);
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('volta recolhido na próxima visita', () => {
        localStorage.setItem(STORAGE_KEY, '1');

        expect(create().collapsed()).toBe(true);
    });

    it('funciona sem acesso ao storage, só não lembra a escolha', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('bloqueado');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('bloqueado');
        });
        const sidebar = create();

        expect(sidebar.collapsed()).toBe(false);
        sidebar.set(true);
        expect(sidebar.collapsed()).toBe(true);
    });
});
