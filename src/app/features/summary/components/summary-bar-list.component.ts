import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { BrlPipe } from '../../../shared/money/brl.pipe';
import type { BarItem } from '../data-access/summary-view';

/**
 * Lista com barras horizontais, da maior para a menor: nome e valor em cima,
 * barra proporcional ao maior valor embaixo e, em letra menor, a parte do total.
 * Laranja, como as despesas no gráfico do ano. Todo número aparece como texto.
 */
@Component({
    selector: 'app-summary-bar-list',
    imports: [BrlPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <ul class="m-0 flex list-none flex-col gap-1 p-0" [attr.aria-label]="label()">
            @for (item of items(); track item.id; let i = $index) {
                <li class="flex flex-col gap-2 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.04]">
                    <div class="flex items-center justify-between gap-3">
                        <span class="flex min-w-0 items-center gap-2.5">
                            <span
                                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-semibold text-muted-color tabular-nums"
                                aria-hidden="true"
                            >
                                {{ i + 1 }}
                            </span>
                            <span class="truncate font-medium">{{ item.label }}</span>
                            @if (item.note) {
                                <span class="shrink-0 text-xs text-muted-color">({{ item.note }})</span>
                            }
                        </span>
                        <span class="font-display font-semibold whitespace-nowrap tabular-nums">{{
                            item.amount | brl
                        }}</span>
                    </div>
                    <div class="h-2.5 rounded-r-[4px] bg-white/[0.05]" aria-hidden="true">
                        <div
                            class="h-full w-(--bar) rounded-r-[4px] bg-expense transition-[width] duration-700 ease-out starting:w-0"
                            [style.--bar]="item.width + '%'"
                        ></div>
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
