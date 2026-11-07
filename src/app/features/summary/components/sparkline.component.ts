import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { sparkline } from '../data-access/summary-view';

/**
 * Minigráfico de linha dos 12 meses (decorativo: os números estão no cartão ao lado).
 * Mostra a linha do zero tracejada e uma marca vertical no mês escolhido.
 */
@Component({
    selector: 'app-sparkline',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block', 'aria-hidden': 'true' },
    template: `
        <svg viewBox="0 0 100 32" preserveAspectRatio="none" class="block h-10 w-full overflow-visible">
            <line
                x1="0"
                x2="100"
                [attr.y1]="line().zeroY"
                [attr.y2]="line().zeroY"
                stroke="currentColor"
                stroke-opacity="0.18"
                stroke-dasharray="3 3"
                vector-effect="non-scaling-stroke"
            />
            @if (line().markerX; as x) {
                <line
                    [attr.x1]="x"
                    [attr.x2]="x"
                    y1="0"
                    y2="32"
                    stroke="currentColor"
                    stroke-opacity="0.35"
                    vector-effect="non-scaling-stroke"
                />
            }
            <polyline
                [attr.points]="line().points"
                fill="none"
                [style.stroke]="color()"
                stroke-width="2"
                stroke-linejoin="round"
                stroke-linecap="round"
                vector-effect="non-scaling-stroke"
            />
        </svg>
    `,
})
export class SparklineComponent {
    /** Valores em centavos, em ordem (janeiro a dezembro). */
    public readonly values = input.required<readonly number[]>();
    /** Posição do mês em destaque (0 a 11), ou null. */
    public readonly marker = input<number | null>(null);
    /** Cor da linha (CSS), ex.: `var(--color-income)`. */
    public readonly color = input('var(--color-income)');

    protected readonly line = computed(() => sparkline(this.values(), this.marker()));
}
