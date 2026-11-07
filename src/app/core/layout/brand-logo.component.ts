import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BrandMarkComponent } from '../../shared/ui/brand-mark.component';
import { BrandNameComponent } from '../../shared/ui/brand-name.component';

/** Marca da aplicação (ícone + nome). `compact` esconde o nome em telas bem pequenas. */
@Component({
    selector: 'app-brand-logo',
    imports: [RouterLink, BrandMarkComponent, BrandNameComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <a
            routerLink="/"
            class="group flex items-center gap-3 rounded-xl text-color no-underline"
            aria-label="Golduck: ir para a visão geral"
            title="Ir para a visão geral"
        >
            <app-brand-mark
                class="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 group-focus-visible:scale-110"
            />
            <span [class]="nameClass()" aria-hidden="true">
                <span class="block font-display text-xl leading-tight font-bold tracking-tight">
                    <app-brand-name />
                </span>
                @if (!compact()) {
                    <span class="block text-[11px] text-muted-color">Make your money count.</span>
                }
            </span>
        </a>
    `,
})
export class BrandLogoComponent {
    public readonly compact = input(false);

    protected readonly nameClass = computed(() => (this.compact() ? 'hidden min-[360px]:block' : 'block'));
}
