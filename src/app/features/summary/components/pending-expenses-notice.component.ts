import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BrlPipe } from '../../../shared/money/brl.pipe';
import type { SummaryPending } from '../data-access/summary.models';

/**
 * Aviso de compras do cartão ainda sem pessoa (`pending` do back): elas contam como compartilhadas,
 * então o resumo pode estar errado, e o envio por e-mail fica bloqueado até alguém escolher.
 * Não aparece quando não há nenhuma.
 */
@Component({
    selector: 'app-pending-expenses-notice',
    imports: [RouterLink, BrlPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (pending().count > 0) {
            <p
                class="m-0 mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-cantaloupe/50 bg-cantaloupe/10 px-4 py-2.5 text-sm"
                role="status"
            >
                <i class="pi pi-user-plus text-cantaloupe" aria-hidden="true"></i>
                <span class="font-medium">
                    {{ pending().count }}
                    {{ pending().count === 1 ? 'compra do cartão sem pessoa' : 'compras do cartão sem pessoa' }}
                    ({{ pending().amount | brl }}).
                </span>
                <span class="text-muted-color">
                    {{ yearly() ? 'No ano, elas' : 'Elas' }} entram como compartilhadas até você escolher a pessoa.
                </span>
                <a routerLink="/faturas" class="font-medium text-primary-300">Classificar nas faturas</a>
            </p>
        }
    `,
})
export class PendingExpensesNoticeComponent {
    public readonly pending = input.required<SummaryPending>();
    /** Resumo do ano: o texto fala do ano todo. */
    public readonly yearly = input(false);
}
