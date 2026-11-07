import { Pipe, type PipeTransform } from '@angular/core';

import { formatBrl } from './money';

/**
 * Exibe um valor da API em reais: `{{ expense.amount | brl }}` → `R$ 1.234,56`.
 *
 * Atenção: no Angular, "pipe" é só uma função de formatação usada no HTML.
 * Não tem relação com os pipes de validação do NestJS.
 */
@Pipe({ name: 'brl' })
export class BrlPipe implements PipeTransform {
    public transform(amount: string | null | undefined): string {
        return amount === null || amount === undefined ? '—' : formatBrl(amount);
    }
}
