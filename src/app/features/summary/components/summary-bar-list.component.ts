import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { BrlPipe } from '../../../shared/money/brl.pipe';
import type { BarItem } from '../data-access/summary-view';

/**
 * Lista com barras horizontais, da maior para a menor: nome e valor em cima,
 * barra proporcional ao maior valor embaixo e, em letra menor, a parte do total.
 * Todo número aparece como texto, então a barra só reforça a comparação.
 */
@Component({
    selector: 'app-summary-bar-list',
    imports: [BrlPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <ul class="m-0 flex list-none flex-col gap-4 p-0" [attr.aria-label]="label()">
            @for (item of items(); track item.id) {
                <li class="flex flex-col gap-1.5">
                    <div class="flex items-baseline justify-between gap-3">
                        <span class="flex min-w-0 items-baseline gap-1.5">
                            <span class="truncate">{{ item.label }}</span>
                            @if (item.note) {
                                <span class="shrink-0 text-xs text-muted-color">({{ item.note }})</span>
                            }
                        </span>
                        <span class="font-medium whitespace-nowrap tabular-nums">{{ item.amount | brl }}</span>
                    </div>
                    <div class="h-2 bg-surface-100" aria-hidden="true">
                        <div class="h-full rounded-r bg-primary-600" [style.width.%]="item.width"></div>
                    </div>
                    <span class="text-xs text-muted-color">
                        {{ item.share }} das despesas · {{ item.count }}
                        {{ item.count === 1 ? 'lançamento' : 'lançamentos' }}
                    </span>
                </li>
            }
        </ul>
    `,
})
export class SummaryBarListComponent {
    public readonly items = input.required<readonly BarItem[]>();
    /** Nome da lista para leitores de tela, ex.: `Despesas por categoria`. */
    public readonly label = input.required<string>();
}
