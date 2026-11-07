import { TestBed } from '@angular/core/testing';

import { SelectedMonthService } from './selected-month.service';

const STORAGE_KEY = 'golduck.selectedMonth';

describe('SelectedMonthService', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 10, 15, 12, 0, 0));
    });

    afterEach(() => {
        vi.useRealTimers();
        sessionStorage.clear();
    });

    function create(): SelectedMonthService {
        return TestBed.inject(SelectedMonthService);
    }

    it('começa no mês atual', () => {
        const month = create();

        expect(month.month()).toBe('2026-11');
        expect(month.year()).toBe(2026);
        expect(month.isCurrentMonth()).toBe(true);
    });

    it('avança e volta virando o ano', () => {
        const month = create();

        month.next();
        expect(month.month()).toBe('2026-12');
        month.next();
        expect(month.month()).toBe('2027-01');
        expect(month.year()).toBe(2027);
        expect(month.isCurrentMonth()).toBe(false);

        month.previous();
        month.previous();
        month.previous();
        expect(month.month()).toBe('2026-10');
    });

    it('ignora meses em formato inválido', () => {
        const month = create();

        month.set('2026-13');
        month.set('novembro');

        expect(month.month()).toBe('2026-11');
    });

    it('volta para o mês atual', () => {
        const month = create();
        month.set('2025-01');

        month.goToCurrentMonth();

        expect(month.month()).toBe('2026-11');
    });

    it('lembra o mês escolhido depois de recarregar a página', () => {
        create().set('2026-03');
        expect(sessionStorage.getItem(STORAGE_KEY)).toBe('2026-03');

        TestBed.resetTestingModule();

        expect(create().month()).toBe('2026-03');
    });

    it('descarta um valor guardado inválido', () => {
        sessionStorage.setItem(STORAGE_KEY, 'lixo');

        expect(create().month()).toBe('2026-11');
    });
});
