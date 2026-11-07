import { Pipe, type PipeTransform } from '@angular/core';

import { CARD_BANK_LABELS, type CardBank } from '../data-access/credit-card.models';

/** `{{ card.bank | cardBank }}` → `Nubank` */
@Pipe({ name: 'cardBank' })
export class CardBankPipe implements PipeTransform {
    public transform(bank: CardBank | null | undefined): string {
        return bank ? (CARD_BANK_LABELS[bank] ?? bank) : '—';
    }
}
