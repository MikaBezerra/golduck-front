import { provideRouter } from '@angular/router';

import { renderComponent } from '../../../testing/components';
import { SidebarNavComponent } from './sidebar-nav.component';

function linkNames(element: HTMLElement): string[] {
    return Array.from(element.querySelectorAll('a')).map((link) => link.textContent?.trim() ?? '');
}

describe('SidebarNavComponent', () => {
    it('recolhido, os links continuam com o nome para leitores de tela', () => {
        const open = renderComponent(SidebarNavComponent, {}, [provideRouter([])]);
        const collapsed = renderComponent(SidebarNavComponent, { collapsed: true }, [provideRouter([])]);

        expect(linkNames(collapsed.nativeElement)).toEqual(linkNames(open.nativeElement));
        expect(linkNames(collapsed.nativeElement)).toContain('Resumo');
    });

    it('mostra só os grupos pedidos, sem o Resumo', () => {
        const fixture = renderComponent(SidebarNavComponent, { showSummary: false, groups: ['Cadastros'] }, [
            provideRouter([]),
        ]);
        const element = fixture.nativeElement as HTMLElement;

        expect(linkNames(element)).not.toContain('Resumo');
        expect(element.textContent).not.toContain('Lançamentos');
    });
});
