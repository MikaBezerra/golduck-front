import { Pipe, type PipeTransform } from '@angular/core';

import { formatPhone } from './phone';

/** `{{ person.phone | phone }}` → `+55 (11) 99999-9999` */
@Pipe({ name: 'phone' })
export class PhonePipe implements PipeTransform {
    public transform(phone: string | null | undefined): string {
        return phone ? formatPhone(phone) : '—';
    }
}
