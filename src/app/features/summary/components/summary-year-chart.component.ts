import {
    ChangeDetectionStrategy,
    Component,
    computed,
    type ElementRef,
    input,
    output,
    signal,
    viewChildren,
} from '@angular/core';

import { BrlPipe } from '../../../shared/money/brl.pipe';
import { mediaQuery } from '../../../shared/ui/media-query';
import { yearChart } from '../data-access/summary-view';
import type { SummaryMonth } from '../data-access/summary.models';

/**
 * Gráfico do ano: entrada (azul) e despesas (laranja) lado a lado em cada mês.
 * Cada mês é um botão: clicar (ou tocar) escolhe o mês, e as setas do teclado andam entre eles.
 * Passar o mouse mostra os valores do mês. O mês escolhido fica em destaque.
 */
@Component({
    selector: 'app-summary-year-chart',
    imports: [BrlPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block' },
    templateUrl: './summary-year-chart.component.html',
})
export class SummaryYearChartComponent {
    /** Os 12 meses do resumo anual. */
    public readonly months = input.required<readonly SummaryMonth[]>();
    /** Mês em destaque (`"AAAA-MM"`). */
    public readonly selected = input.required<string>();
    public readonly selectMonth = output<string>();

    private readonly columns = viewChildren<ElementRef<HTMLButtonElement>>('column');

    protected readonly chart = computed(() => yearChart(this.months()));
    protected readonly selectedIndex = computed(() =>
        this.chart().points.findIndex((point) => point.month === this.selected()),
    );
    protected readonly year = computed(() => this.selected().slice(0, 4));

    /** Celular: rótulos de uma letra (J F M…). */
    protected readonly wide = mediaQuery('(min-width: 640px)');
    /** Em telas de toque não há "passar o mouse": o mês tocado já aparece nos cartões de cima. */
    private readonly canHover = mediaQuery('(hover: hover)');
    private readonly hovered = signal<number | null>(null);
    /** Mês sob o mouse (as barras dele saem da penumbra). */
    protected readonly hoveredIndex = this.hovered.asReadonly();
    /** Mês focado pelo teclado (Tab ou setas). */
    private readonly keyboardFocus = signal<number | null>(null);

    protected readonly tooltip = computed(() => {
        const index = (this.canHover() ? this.hovered() : null) ?? this.keyboardFocus();
        const point = index === null ? undefined : this.chart().points[index];

        if (index === null || !point) {
            return null;
        }

        const count = this.chart().points.length;
        // Nas pontas, o balão encosta na borda em vez de centralizar (não sai do gráfico).
        const align = index <= 1 ? 'translate-x-0' : index >= count - 2 ? '-translate-x-full' : '-translate-x-1/2';
        const left =
            index <= 1
                ? (index / count) * 100
                : index >= count - 2
                  ? ((index + 1) / count) * 100
                  : ((index + 0.5) / count) * 100;

        return { point, left, align };
    });

    protected readonly columnClass =
        'flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-0 bg-transparent px-0 pt-0 pb-1.5 ' +
        'transition-colors hover:bg-white/[0.04]';
    protected readonly selectedColumnClass =
        this.columnClass + ' !bg-white/[0.07] shadow-[inset_0_0_0_1px_rgb(2_151_222/0.45)]';

    protected hover(index: number | null): void {
        this.hovered.set(index);
    }

    protected onFocus(event: FocusEvent, index: number): void {
        // Só mostra o balão quando o foco veio do teclado (no clique o mouse já mostra).
        const target = event.target as HTMLElement;

        this.keyboardFocus.set(target.matches(':focus-visible') ? index : null);
    }

    protected onBlur(): void {
        this.keyboardFocus.set(null);
    }

    protected choose(index: number): void {
        const point = this.chart().points[index];

        if (point) {
            this.selectMonth.emit(point.month);
        }
    }

    /** Setas, Home e End andam entre os meses, como num grupo de opções. */
    protected onKeydown(event: KeyboardEvent, index: number): void {
        const last = this.chart().points.length - 1;
        const targets: Partial<Record<string, number>> = {
            ArrowLeft: Math.max(0, index - 1),
            ArrowUp: Math.max(0, index - 1),
            ArrowRight: Math.min(last, index + 1),
            ArrowDown: Math.min(last, index + 1),
            Home: 0,
            End: last,
        };
        const target = targets[event.key];

        if (target === undefined) {
            return;
        }

        event.preventDefault();
        this.choose(target);
        this.columns()[target]?.nativeElement.focus();
        this.keyboardFocus.set(target);
    }
}
