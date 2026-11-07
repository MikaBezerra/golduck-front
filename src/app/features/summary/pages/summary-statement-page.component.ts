import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';

import { SelectedMonthService } from '../../../core/month/selected-month.service';
import { remoteData } from '../../../shared/data/remote-data';
import { amountToCents } from '../../../shared/money/money';
import { BrlPipe } from '../../../shared/money/brl.pipe';
import { formatMonth } from '../../../shared/month/month';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { buildStatement, type StatementRow, type StatementSource } from '../data-access/summary-statement';
import { SummaryStatementService } from '../data-access/summary-statement.service';

/**
 * Resumo do mês em tabela: uma coluna de total e uma por pessoa ativa. Entrada, o que é
 * compartilhado (dividido igualmente), o que é de cada um e os líquidos. As linhas com seta
 * abrem os detalhes (cada despesa, cada cartão). O mês é o do seletor do topo.
 */
@Component({
    selector: 'app-summary-statement-page',
    imports: [RouterLink, Button, Skeleton, BrlPipe, PageHeaderComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './summary-statement-page.component.html',
})
export class SummaryStatementPageComponent {
    private readonly statementService = inject(SummaryStatementService);

    protected readonly month = inject(SelectedMonthService).month;
    protected readonly source = remoteData({
        params: () => this.month(),
        load: (month) => this.statementService.load(month),
        initialValue: null as StatementSource | null,
    });

    /** Tabela do mês selecionado (null enquanto um mês novo carrega). */
    protected readonly statement = computed(() => {
        const source = this.source.value();

        return source?.month === this.month() ? buildStatement(source) : null;
    });
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
    protected blank(row: StatementRow): string {
        return row.style === 'detail' ? '' : '—';
    }

    protected rowClass(row: StatementRow): string {
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
