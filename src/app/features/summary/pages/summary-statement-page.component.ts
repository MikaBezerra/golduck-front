import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';
import { Tooltip } from 'primeng/tooltip';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { SelectedMonthService } from '../../../core/month/selected-month.service';
import { remoteData } from '../../../shared/data/remote-data';
import { amountToCents } from '../../../shared/money/money';
import { BrlPipe } from '../../../shared/money/brl.pipe';
import { formatMonth } from '../../../shared/month/month';
import { mediaQuery } from '../../../shared/ui/media-query';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { SummaryDispatchDialogComponent } from '../../summary-dispatch/components/summary-dispatch-dialog.component';
import type { SummaryDispatchPreview } from '../../summary-dispatch/data-access/summary-dispatch.models';
import { SummaryDispatchService } from '../../summary-dispatch/data-access/summary-dispatch.service';
import type { SummaryStatement, SummaryStatementRow } from '../data-access/summary.models';
import { SummaryService } from '../data-access/summary.service';

/**
 * Resumo do mês em tabela: uma coluna de total e uma por pessoa ativa. Entrada, o que é
 * compartilhado (dividido igualmente), o que é de cada um e os líquidos. As linhas com seta
 * abrem os detalhes (cada despesa, cada cartão). O mês é o do seletor do topo.
 * A tabela vem pronta do back (`GET /summary/statement`): a tela só formata e mostra.
 *
 * Para ADMIN, "Enviar por e-mail" manda a cada pessoa o resumo dela (diálogo de envio) e,
 * abaixo do cabeçalho, aparece o último envio do mês.
 */
@Component({
    selector: 'app-summary-statement-page',
    imports: [
        DatePipe,
        RouterLink,
        Button,
        Skeleton,
        Tooltip,
        BrlPipe,
        PageHeaderComponent,
        SummaryDispatchDialogComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './summary-statement-page.component.html',
})
export class SummaryStatementPageComponent {
    private readonly summary = inject(SummaryService);
    private readonly dispatches = inject(SummaryDispatchService);
    private readonly auth = inject(AuthService);

    protected readonly month = inject(SelectedMonthService).month;
    protected readonly source = remoteData({
        params: () => this.month(),
        load: (month) => this.summary.findStatement(month),
        initialValue: null as SummaryStatement | null,
    });

    /** Tabela do mês selecionado (null enquanto um mês novo carrega). */
    protected readonly statement = computed(() => {
        const statement = this.source.value();

        return statement?.month === this.month() ? statement : null;
    });
    /** O envio por e-mail é só para ADMIN (as rotas do back também). */
    protected readonly isAdmin = computed(() => this.auth.user()?.role === 'ADMIN');
    /** Prévia do envio do mês: se está ligado e o último envio (só busca para ADMIN). */
    protected readonly dispatchInfo = remoteData({
        params: () => (this.isAdmin() ? this.month() : null),
        load: (month) => (month === null ? of(null) : this.dispatches.preview(month)),
        initialValue: null as SummaryDispatchPreview | null,
    });
    protected readonly lastDispatch = computed(() => {
        const info = this.dispatchInfo.value();

        return info?.month === this.month() ? info.lastDispatch : null;
    });
    protected readonly dispatchDisabled = computed(() => this.dispatchInfo.value()?.enabled === false);
    protected readonly dispatchOpen = signal(false);
    /** No celular o botão de envio mostra só o ícone. */
    protected readonly wide = mediaQuery('(min-width: 640px)');

    protected readonly failed = computed(() => !this.source.loading() && this.statement() === null);
    protected readonly subtitle = computed(() => formatMonth(this.month()));

    /** Linhas com detalhes abertos (ids). */
    private readonly open = signal<ReadonlySet<string>>(new Set());
    protected readonly expandableIds = computed(
        () =>
            this.statement()
                ?.sections.flatMap((section) => section.rows)
                .filter((row) => row.children.length > 0)
                .map((row) => row.id) ?? [],
    );
    protected readonly allOpen = computed(
        () => this.expandableIds().length > 0 && this.expandableIds().every((id) => this.open().has(id)),
    );

    /** Primeira coluna: fica parada ao deslizar a tabela para o lado (fundo sólido para cobrir). */
    protected readonly firstColumnClass =
        'sticky left-0 z-10 min-w-36 bg-surface-900 px-3 sm:static sm:min-w-56 sm:bg-transparent sm:px-5';

    protected isOpen(id: string): boolean {
        return this.open().has(id);
    }

    protected toggle(id: string): void {
        this.open.update((current) => {
            const next = new Set(current);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    protected toggleAll(): void {
        this.open.set(this.allOpen() ? new Set() : new Set(this.expandableIds()));
    }

    protected isNegative(amount: string | null): boolean {
        return amount !== null && amountToCents(amount) < 0;
    }

    /** Texto da célula: valor, "—" (não se aplica) ou vazio nos detalhes. */
    protected blank(row: SummaryStatementRow): string {
        return row.style === 'detail' ? '' : '—';
    }

    protected rowClass(row: SummaryStatementRow): string {
        switch (row.style) {
            case 'subtotal':
                return 'border-t border-line font-semibold';
            case 'result':
                return 'border-t border-line font-semibold';
            case 'highlight':
                return 'border-t border-cantaloupe/40 bg-cantaloupe/[0.07] font-display text-base font-bold sm:text-lg';
            case 'detail':
                return 'text-sm text-muted-color';
            default:
                return '';
        }
    }
}
