import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Ícone da marca (o mesmo desenho do favicon: cifrão com raios) num quadrado azul.
 * Decorativo: quem usa dá o nome acessível (ex.: o link da marca).
 */
@Component({
    selector: 'app-brand-mark',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { 'aria-hidden': 'true', class: 'inline-flex shrink-0' },
    template: `
        <span [class]="boxClass()">
            <svg viewBox="0 0 512 512" [attr.width]="iconSize()" [attr.height]="iconSize()" focusable="false">
                <g fill="none" stroke="currentColor" stroke-width="30" stroke-linecap="round">
                    <line x1="256" y1="16" x2="256" y2="70" />
                    <line x1="256" y1="442" x2="256" y2="496" />
                    <line x1="16" y1="256" x2="70" y2="256" />
                    <line x1="442" y1="256" x2="496" y2="256" />
                    <line x1="86" y1="86" x2="124" y2="124" />
                    <line x1="388" y1="124" x2="426" y2="86" />
                    <line x1="86" y1="426" x2="124" y2="388" />
                    <line x1="388" y1="388" x2="426" y2="426" />
                </g>
                <rect x="243" y="118" width="26" height="276" fill="currentColor" />
                <path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="54"
                    d="M330 200 C324 170 296 156 256 156 C212 156 186 176 186 206 C186 238 214 250 256 260 C302 271 332 286 332 322 C332 356 302 376 256 376 C208 376 180 356 174 320"
                />
            </svg>
        </span>
    `,
})
export class BrandMarkComponent {
    public readonly size = input<'md' | 'lg'>('md');

    protected readonly iconSize = computed(() => (this.size() === 'lg' ? 34 : 24));
    protected readonly boxClass = computed(
        () =>
            'flex items-center justify-center bg-linear-135 from-primary-400 to-primary-700 text-midnight ' +
            (this.size() === 'lg'
                ? 'h-16 w-16 rounded-2xl shadow-[0_14px_36px_-12px_rgb(2_151_222/0.9)]'
                : 'h-10 w-10 rounded-xl shadow-[0_10px_28px_-10px_rgb(2_151_222/0.9)]'),
    );
}
