import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { BrlPipe } from '../../../shared/money/brl.pipe';
import type { NetRow } from '../data-access/summary-view';

/**
 * Líquido de cada pessoa ativa: parte da entrada (depois das compartilhadas)
 * menos as despesas individuais. No celular, parte e despesas vão para baixo do nome.
 */
@Component({
    selector: 'app-summary-net-table',
    imports: [BrlPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <table class="w-full border-collapse text-left" [attr.aria-labelledby]="labelledBy()">
            <thead>
                <tr class="border-b border-surface text-sm text-muted-color">
                    <th scope="col" class="py-2 pr-3 font-medium">Pessoa</th>
                    <th scope="col" class="hidden px-3 py-2 text-right font-medium sm:table-cell">Parte da entrada</th>
                    <th scope="col" class="hidden px-3 py-2 text-right font-medium sm:table-cell">
                        Despesas individuais
                    </th>
                    <th scope="col" class="py-2 pl-3 text-right font-medium">Líquido</th>
                </tr>
            </thead>
            <tbody>
                @for (row of rows(); track row.personId) {
                    <tr class="border-b border-surface last:border-b-0">
                        <th scope="row" class="py-3 pr-3 font-normal">
                            <span class="block">{{ row.name }}</span>
                            <span class="block text-xs text-muted-color sm:hidden">
                                Parte {{ row.share | brl }} · despesas {{ row.individual | brl }}
                            </span>
                        </th>
                        <td class="hidden px-3 py-3 text-right whitespace-nowrap tabular-nums sm:table-cell">
                            {{ row.share | brl }}
                        </td>
                        <td class="hidden px-3 py-3 text-right whitespace-nowrap tabular-nums sm:table-cell">
                            {{ row.individual | brl }}
                        </td>
                        <td class="py-3 pl-3 text-right">
                            <span class="block font-semibold whitespace-nowrap tabular-nums">{{ row.net | brl }}</span>
                            @if (row.negative) {
                                <span class="flex items-center justify-end gap-1 text-xs text-red-700">
                                    <i class="pi pi-arrow-down text-xs" aria-hidden="true"></i>
                                    Gastou além da parte
                                </span>
                            } @else {
                                <span class="flex items-center justify-end gap-1 text-xs text-muted-color">
                                    <i class="pi pi-check text-xs" aria-hidden="true"></i>
                                    Sobra
                                </span>
                            }
                        </td>
                    </tr>
                }
            </tbody>
        </table>
    `,
})
export class SummaryNetTableComponent {
    public readonly rows = input.required<readonly NetRow[]>();
    /** Id do título que dá nome à tabela para leitores de tela. */
    public readonly labelledBy = input<string>();
}
