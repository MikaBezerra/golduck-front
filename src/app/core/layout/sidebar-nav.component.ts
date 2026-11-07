import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { NAV_ITEMS } from './navigation';

@Component({
    selector: 'app-sidebar-nav',
    imports: [RouterLink, RouterLinkActive],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <nav aria-label="Menu principal">
            <ul class="m-0 flex list-none flex-col gap-1 p-0">
                <li>
                    <a
                        routerLink="/"
                        routerLinkActive="active"
                        [routerLinkActiveOptions]="{ exact: true }"
                        [class]="linkClass"
                        (click)="navigate.emit()"
                    >
                        <i class="pi pi-chart-bar" aria-hidden="true"></i>
                        Resumo
                    </a>
                </li>
                @for (item of items; track item.route) {
                    <li>
                        <a
                            [routerLink]="item.route"
                            routerLinkActive="active"
                            [class]="linkClass"
                            (click)="navigate.emit()"
                        >
                            <i [class]="item.icon" aria-hidden="true"></i>
                            {{ item.label }}
                        </a>
                    </li>
                }
            </ul>
        </nav>
    `,
})
export class SidebarNavComponent {
    /** Avisa quem usa o menu que um link foi clicado (o menu do celular se fecha). */
    public readonly navigate = output();

    protected readonly items = NAV_ITEMS;
    protected readonly linkClass =
        'flex items-center gap-3 rounded-border px-3 py-2.5 text-muted-color no-underline transition-colors ' +
        'hover:bg-emphasis hover:text-color [&.active]:bg-primary-50 [&.active]:font-medium [&.active]:text-primary-700';
}
