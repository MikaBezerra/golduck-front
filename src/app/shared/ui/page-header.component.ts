import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Cabeçalho padrão das páginas: título, subtítulo e, à direita, os botões
 * de ação que forem colocados dentro da tag.
 *
 * `<app-page-header title="Categorias" subtitle="..."> <p-button label="Nova" /> </app-page-header>`
 */
@Component({
    selector: 'app-page-header',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <header class="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
                <h1 class="m-0 text-2xl font-semibold text-color">{{ title() }}</h1>
                @if (subtitle()) {
                    <p class="mt-1 mb-0 text-muted-color">{{ subtitle() }}</p>
                }
            </div>
            <div class="flex flex-wrap items-center gap-2">
                <ng-content />
            </div>
        </header>
    `,
})
export class PageHeaderComponent {
    public readonly title = input.required<string>();
    public readonly subtitle = input<string>();
}
