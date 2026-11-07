import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';

import { dateToMonthKey, monthKeyToDate } from '../../shared/month/month';
import { SelectedMonthService } from '../month/selected-month.service';

/** Seletor de mês do topo: setas para navegar e um calendário de meses no meio. */
@Component({
    selector: 'app-month-picker',
    imports: [FormsModule, Button, DatePicker],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex items-center gap-1">
            @if (!selectedMonth.isCurrentMonth()) {
                <p-button
                    label="Hoje"
                    size="small"
                    [text]="true"
                    severity="secondary"
                    (onClick)="selectedMonth.goToCurrentMonth()"
                />
            }
            <p-button
                icon="pi pi-chevron-left"
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
                dateFormat="MM 'de' yy"
                [readonlyInput]="true"
                appendTo="body"
                inputStyleClass="w-40 text-center cursor-pointer"
                ariaLabel="Mês selecionado"
            />
            <p-button
                icon="pi pi-chevron-right"
                [text]="true"
                [rounded]="true"
                severity="secondary"
                ariaLabel="Próximo mês"
                (onClick)="selectedMonth.next()"
            />
        </div>
    `,
})
export class MonthPickerComponent {
    protected readonly selectedMonth = inject(SelectedMonthService);
    protected readonly date = computed(() => monthKeyToDate(this.selectedMonth.month()));

    protected onPick(value: Date | null): void {
        if (value) {
            this.selectedMonth.set(dateToMonthKey(value));
        }
    }
}
