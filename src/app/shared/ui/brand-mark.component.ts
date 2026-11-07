import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Símbolo da marca: a moeda de R$ (o mesmo desenho do favicon, `public/favicon.svg`).
 * Decorativo: quem usa dá o nome acessível (ex.: o link da marca).
 */
@Component({
    selector: 'app-brand-mark',
    imports: [NgOptimizedImage],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { 'aria-hidden': 'true', class: 'inline-flex shrink-0' },
    template: `
        <img
            ngSrc="favicon.svg"
            [width]="pixels()"
            [height]="pixels()"
            [priority]="size() === 'lg'"
            alt=""
            class="drop-shadow-[0_8px_18px_rgb(252_115_77/0.45)]"
        />
    `,
})
export class BrandMarkComponent {
    public readonly size = input<'md' | 'lg'>('md');

    protected readonly pixels = computed(() => (this.size() === 'lg' ? 64 : 40));
}
