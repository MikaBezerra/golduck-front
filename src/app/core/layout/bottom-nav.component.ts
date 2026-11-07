import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';

import { NAV_GROUPS, type NavItem, SUMMARY_ITEM } from './navigation';

/**
 * Barra de navegação fixa no pé da tela (celular e tablet): Resumo, os lançamentos
 * e um botão "Mais" que abre os cadastros. Some em telas grandes, onde há o menu lateral.
 */
@Component({
    selector: 'app-bottom-nav',
    imports: [RouterLink, RouterLinkActive],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'fixed inset-x-0 bottom-0 z-30 block px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden' },
    template: `
        <nav aria-label="Menu principal" class="mx-auto max-w-md">
            <ul
                class="surface-card m-0 grid list-none grid-cols-5 gap-1 !rounded-2xl !bg-card-strong p-1.5"
                [style.grid-template-columns]="'repeat(' + (items.length + 1) + ', minmax(0, 1fr))'"
            >
                @for (item of items; track item.route) {
                    <li>
                        <a
                            [routerLink]="item.route"
                            routerLinkActive="active"
                            [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                            ariaCurrentWhenActive="page"
                            [class]="itemClass"
                        >
                            <i [class]="item.icon + ' text-lg'" aria-hidden="true"></i>
                            <span class="max-w-full truncate">{{ item.label }}</span>
                        </a>
                    </li>
                }
                <li>
                    <button
                        type="button"
                        [class]="itemClass"
                        [class.active]="moreActive() || moreOpen()"
                        aria-haspopup="dialog"
                        [attr.aria-expanded]="moreOpen()"
                        (click)="more.emit()"
                    >
                        <i class="pi pi-th-large text-lg" aria-hidden="true"></i>
                        <span>Mais</span>
                    </button>
                </li>
            </ul>
        </nav>
    `,
})
export class BottomNavComponent {
    private readonly router = inject(Router);

    /** A folha "Mais" está aberta. */
    public readonly moreOpen = input(false);
    public readonly more = output();

    protected readonly items: readonly NavItem[] = [
        SUMMARY_ITEM,
        ...NAV_GROUPS.filter((group) => group.inMobileBar).flatMap((group) => group.items),
    ];
    private readonly moreRoutes = NAV_GROUPS.filter((group) => !group.inMobileBar).flatMap((group) =>
        group.items.map((item) => item.route),
    );
    private readonly url = toSignal(
        this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            map(() => this.router.url),
        ),
        { initialValue: this.router.url },
    );
    /** A tela aberta é um dos itens do "Mais" (o botão fica aceso). */
    protected readonly moreActive = computed(() =>
        this.moreRoutes.some((route) => this.url().split('?')[0].startsWith(route)),
    );

    protected readonly itemClass =
        'flex min-h-12 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-0 bg-transparent px-1 py-1.5 ' +
        'font-sans text-[11px] font-medium text-muted-color no-underline transition-colors ' +
        'relative hover:text-color [&.active]:bg-primary/15 [&.active]:text-white [&.active>i]:text-primary-300 ' +
        // Pontinho laranja em cima do item ativo.
        "after:absolute after:top-1 after:h-1 after:w-1 after:rounded-full after:bg-cantaloupe after:opacity-0 after:content-[''] " +
        '[&.active]:after:opacity-100 [&.active]:after:shadow-[0_0_8px_rgb(252_115_77/0.9)]';
}
