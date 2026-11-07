import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { BrlPipe } from '../../../shared/money/brl.pipe';
import type { NetCard } from '../data-access/summary-view';

/**
 * Um cartão por pessoa ativa: o líquido em destaque, a parte da entrada, as despesas
 * individuais e um medidor de quanto da parte já foi gasto.
 */
@Component({
    selector: 'app-summary-net-cards',
    imports: [BrlPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <ul class="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
            @for (card of cards(); track card.personId) {
                <li class="flex flex-col gap-3 rounded-2xl border border-line bg-white/[0.03] p-4">
                    <div class="flex items-center gap-3">
                        <span
                            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-135 from-primary-400/90 to-primary-700 font-display font-bold text-midnight"
                            aria-hidden="true"
                        >
                            {{ card.initial }}
                        </span>
                        <span class="min-w-0 flex-1 truncate font-medium">{{ card.name }}</span>
                    </div>

                    <div>
                        <span class="block text-xs text-muted-color">Líquido</span>
                        <span class="block font-display text-2xl font-bold" [class.text-negative]="card.negative">
                            {{ card.net | brl }}
                        </span>
                        @if (card.negative) {
                            <span class="mt-0.5 flex items-center gap-1 text-xs text-negative">
                                <i class="pi pi-arrow-down text-[10px]" aria-hidden="true"></i>
                                Gastou além da parte
                            </span>
                        } @else {
                            <span class="mt-0.5 flex items-center gap-1 text-xs text-muted-color">
                                <i class="pi pi-check text-[10px]" aria-hidden="true"></i>
                                Sobra
                            </span>
                        }
                    </div>

                    <div class="h-1.5 rounded-r-[4px] bg-white/[0.06]" aria-hidden="true">
                        <div
                            class="h-full w-(--bar) rounded-r-[4px] transition-[width] duration-700 ease-out starting:w-0"
                            [class.bg-expense]="!card.negative"
                            [class.bg-negative]="card.negative"
                            [style.--bar]="card.usage + '%'"
                        ></div>
                    </div>

                    <dl class="m-0 grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <dt class="text-xs text-muted-color">Parte da entrada</dt>
                            <dd class="m-0 tabular-nums">{{ card.share | brl }}</dd>
                        </div>
                        <div>
                            <dt class="text-xs text-muted-color">Despesas individuais</dt>
                            <dd class="m-0 tabular-nums">{{ card.individual | brl }}</dd>
                        </div>
                    </dl>
                </li>
            }
        </ul>
    `,
})
export class SummaryNetCardsComponent {
    public readonly cards = input.required<readonly NetCard[]>();
}
