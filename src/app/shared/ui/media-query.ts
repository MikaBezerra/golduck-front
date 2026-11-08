import { DestroyRef, inject, type Signal, signal } from '@angular/core';

/**
 * Signal que acompanha uma media query do CSS, ex.: `mediaQuery('(min-width: 640px)')`.
 * Útil quando o TypeScript precisa saber o tamanho da tela (formato de data, rótulos de gráfico);
 * para só esconder ou mostrar coisas, prefira as classes do Tailwind (`sm:`, `lg:`).
 *
 * Precisa ser criado no corpo da classe do componente (contexto de injeção).
 */
export function mediaQuery(query: string): Signal<boolean> {
    // Sem matchMedia (ex.: o jsdom dos testes), a query vale como "não casa".
    const list =
        typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query) : null;
    const matches = signal(list?.matches ?? false);

    if (list) {
        const listener = (event: MediaQueryListEvent): void => matches.set(event.matches);

        list.addEventListener('change', listener);
        inject(DestroyRef).onDestroy(() => list.removeEventListener('change', listener));
    }

    return matches.asReadonly();
}
