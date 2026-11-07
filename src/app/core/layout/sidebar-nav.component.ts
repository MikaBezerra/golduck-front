import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { NAV_GROUPS, SUMMARY_ITEM } from './navigation';

/** Menu em grupos (Lançamentos, Cadastros). Usado no menu lateral e na folha "Mais" do celular. */
@Component({
    selector: 'app-sidebar-nav',
    imports: [RouterLink, RouterLinkActive],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <nav [attr.aria-label]="label()" class="flex flex-col gap-6">
            @if (showSummary()) {
                <ul class="m-0 flex list-none flex-col gap-1 p-0">
                    <li>
                        <a
                            [routerLink]="home.route"
                            routerLinkActive="active"
                            [routerLinkActiveOptions]="{ exact: home.exact ?? false }"
                            ariaCurrentWhenActive="page"
                            [class]="linkClass"
                            (click)="navigate.emit()"
                        >
                            <i [class]="home.icon" aria-hidden="true"></i>
                            {{ home.label }}
                        </a>
                    </li>
                </ul>
            }
            @for (group of visibleGroups(); track group.label) {
                <div>
                    <p
                        [id]="idPrefix() + group.label"
                        class="m-0 mb-2 px-3 text-[11px] font-semibold tracking-[0.14em] text-cantaloupe/85 uppercase"
                    >
                        {{ group.label }}
                    </p>
                    <ul class="m-0 flex list-none flex-col gap-1 p-0" [attr.aria-labelledby]="idPrefix() + group.label">
                        @for (item of group.items; track item.route) {
                            <li>
                                <a
                                    [routerLink]="item.route"
                                    routerLinkActive="active"
                                    ariaCurrentWhenActive="page"
                                    [class]="linkClass"
                                    (click)="navigate.emit()"
                                >
                                    <i [class]="item.icon" aria-hidden="true"></i>
                                    {{ item.label }}
                                </a>
                            </li>
                        }
                    </ul>
                </div>
            }
        </nav>
    `,
})
export class SidebarNavComponent {
    /** Mostra o item Resumo no topo. */
    public readonly showSummary = input(true);
    /** Nomes dos grupos a mostrar; vazio = todos. */
    public readonly groups = input<readonly string[]>([]);
    public readonly label = input('Menu principal');
    /** Prefixo dos ids dos títulos de grupo (o menu aparece em dois lugares da tela). */
    public readonly idPrefix = input('nav-');
    /** Avisa quem usa o menu que um link foi clicado (a folha do celular se fecha). */
    public readonly navigate = output();

    protected readonly home = SUMMARY_ITEM;
    protected readonly visibleGroups = computed(() => {
        const only = this.groups();

        return only.length === 0 ? NAV_GROUPS : NAV_GROUPS.filter((group) => only.includes(group.label));
    });
    protected readonly linkClass =
        'relative flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-muted-color no-underline ' +
        'transition-colors hover:bg-white/5 hover:text-color ' +
        '[&.active]:bg-linear-90 [&.active]:from-primary/25 [&.active]:to-primary/5 [&.active]:text-white ' +
        '[&.active]:shadow-[inset_0_0_0_1px_rgb(2_151_222/0.35)] [&.active>i]:text-primary-300 ' +
        "before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-cantaloupe before:shadow-[0_0_12px_rgb(252_115_77/0.8)] before:opacity-0 before:content-[''] " +
        '[&.active]:before:opacity-100';
}
