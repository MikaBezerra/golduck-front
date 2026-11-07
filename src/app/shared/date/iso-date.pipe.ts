import { Pipe, type PipeTransform } from '@angular/core';

/**
 * Datas sem horário vindas da API (`"2026-11-03"`) → `03/11/2026`.
 *
 * Não use o `DatePipe` do Angular para elas: ele interpreta `"2026-11-03"` como
 * meia-noite em UTC e, no fuso do Brasil, mostraria 02/11.
 */
@Pipe({ name: 'isoDate' })
export class IsoDatePipe implements PipeTransform {
    public transform(date: string | null | undefined, style: 'full' | 'short' = 'full'): string {
        const match = date ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(date) : null;

        if (!match) {
            return date ?? '—';
        }

        const [, year, month, day] = match;

        return style === 'short' ? `${day}/${month}` : `${day}/${month}/${year}`;
    }
}
