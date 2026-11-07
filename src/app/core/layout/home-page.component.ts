import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { NAV_ITEMS } from './navigation';

/** Página inicial: atalhos para cada área. Será substituída pelo dashboard quando o back tiver o resumo mensal. */
@Component({
    selector: 'app-home-page',
    imports: [RouterLink, PageHeaderComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header title="Início" subtitle="Escolha por onde começar." />

        @if (items.length === 0) {
            <p class="text-muted-color">Nenhuma área disponível ainda.</p>
        } @else {
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                @for (item of items; track item.route) {
                    <a
                        [routerLink]="item.route"
                        class="flex flex-col gap-3 rounded-xl border border-surface bg-surface-0 p-5 text-color no-underline transition-shadow hover:shadow-md"
                    >
                        <span
                            class="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-700"
                        >
                            <i [class]="item.icon + ' text-xl'" aria-hidden="true"></i>
                        </span>
                        <span class="text-lg font-semibold">{{ item.label }}</span>
                        <span class="text-sm text-muted-color">{{ item.description }}</span>
                    </a>
                }
            </div>
        }
    `,
})
export class HomePageComponent {
    protected readonly items = NAV_ITEMS;
}
