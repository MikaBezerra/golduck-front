import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';

import { dateToMonthKey, monthKeyToDate } from '../../shared/month/month';
import { mediaQuery } from '../../shared/ui/media-query';
import { SelectedMonthService } from '../month/selected-month.service';

/**
 * Seletor de mês do topo: setas para navegar e um calendário de meses no meio.
 * No celular o mês aparece abreviado (`nov/2026`) para caber ao lado da marca.
 */
@Component({
    selector: 'app-month-picker',
    imports: [FormsModule, Button, DatePicker],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex items-center gap-1.5">
            @if (!selectedMonth.isCurrentMonth()) {
                <p-button
                    [label]="wide() ? 'Hoje' : undefined"
                    icon="pi pi-calendar"
                    size="small"
                    [text]="true"
                    [rounded]="!wide()"
                    severity="secondary"
                    ariaLabel="Voltar para o mês atual"
                    (onClick)="selectedMonth.goToCurrentMonth()"
                />
            }
            <div class="surface-card flex items-center !rounded-full p-1">
                <p-button
                    icon="pi pi-chevron-left"
                    size="small"
                    [text]="true"
                    [rounded]="true"
                    severity="secondary"
                    ariaLabel="Mês anterior"
                    (onClick)="selectedMonth.previous()"
                />
                <p-datepicker
                    [ngModel]="date()"
                    (ngModelChange)="onPick($event)"
                    view="month"
                    [dateFormat]="wide() ? longFormat : shortFormat"
                    [readonlyInput]="true"
                    appendTo="body"
                    inputStyleClass="!w-24 sm:!w-44 cursor-pointer !border-0 !bg-transparent !px-1 !py-1 text-center font-display font-semibold !shadow-none"
                    ariaLabel="Mês selecionado"
                />
                <p-button
                    icon="pi pi-chevron-right"
                    size="small"
                    [text]="true"
                    [rounded]="true"
                    severity="secondary"
                    ariaLabel="Próximo mês"
                    (onClick)="selectedMonth.next()"
                />
            </div>
        </div>
    `,
})
export class MonthPickerComponent {
    protected readonly selectedMonth = inject(SelectedMonthService);
    protected readonly date = computed(() => monthKeyToDate(this.selectedMonth.month()));
    protected readonly wide = mediaQuery('(min-width: 640px)');
    /** `novembro de 2026` */
    protected readonly longFormat = "MM 'de' yy";
    /** `nov/2026` */
    protected readonly shortFormat = 'M/yy';

    protected onPick(value: Date | null): void {
        if (value) {
            this.selectedMonth.set(dateToMonthKey(value));
        }
    }
}
