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
        <header class="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div>
                <h1 class="m-0 text-3xl font-bold text-color sm:text-4xl">{{ title() }}</h1>
                <span
                    class="mt-2 block h-1 w-12 rounded-full bg-linear-90 from-cantaloupe to-cantaloupe/0 shadow-[0_0_14px_rgb(252_115_77/0.6)]"
                    aria-hidden="true"
                ></span>
                @if (subtitle()) {
                    <p class="mt-2 mb-0 text-muted-color first-letter:uppercase">{{ subtitle() }}</p>
                }
            </div>
            <div
                class="flex w-full flex-wrap items-center gap-2 empty:hidden sm:w-auto [&>*]:max-sm:grow [&_.p-button]:max-sm:w-full [&_.p-button-label]:whitespace-nowrap"
            >
                <ng-content />
            </div>
        </header>
    `,
})
export class PageHeaderComponent {
    public readonly title = input.required<string>();
    public readonly subtitle = input<string>();
}
