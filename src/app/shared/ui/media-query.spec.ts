import { TestBed } from '@angular/core/testing';

import { mediaQuery } from './media-query';

type Listener = (event: MediaQueryListEvent) => void;

describe('mediaQuery', () => {
    let listeners: Listener[];
    const originalMatchMedia = window.matchMedia;

    beforeEach(() => {
        listeners = [];
        window.matchMedia = vi.fn((query: string) => ({
            matches: query === '(min-width: 640px)',
            media: query,
            addEventListener: (_type: string, listener: Listener) => listeners.push(listener),
            removeEventListener: (_type: string, listener: Listener) => {
                listeners = listeners.filter((current) => current !== listener);
            },
        })) as unknown as typeof window.matchMedia;
    });

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
    });

    it('começa com o estado atual da tela e acompanha as mudanças', () => {
        const wide = TestBed.runInInjectionContext(() => mediaQuery('(min-width: 640px)'));

        expect(wide()).toBe(true);

        listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent));

        expect(wide()).toBe(false);
    });

    it('para de ouvir quando o componente é destruído', () => {
        TestBed.runInInjectionContext(() => mediaQuery('(min-width: 1024px)'));
        expect(listeners).toHaveLength(1);

        TestBed.resetTestingModule();

        expect(listeners).toHaveLength(0);
    });
});
