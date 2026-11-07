import { Pipe, type PipeTransform } from '@angular/core';

import { formatMonth, formatMonthShort } from './month';

/** `{{ '2026-11' | month }}` → `Novembro de 2026` · `{{ '2026-11' | month: 'short' }}` → `nov/2026` */
@Pipe({ name: 'month' })
export class MonthPipe implements PipeTransform {
    public transform(key: string | null | undefined, style: 'long' | 'short' = 'long'): string {
        if (!key) {
            return '—';
        }

        return style === 'short' ? formatMonthShort(key) : formatMonth(key);
    }
}
