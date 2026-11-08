import { provideRouter } from '@angular/router';

import { renderComponent } from '../../../../testing/components';
import { PendingExpensesNoticeComponent } from './pending-expenses-notice.component';

describe('PendingExpensesNoticeComponent', () => {
    function textOf(inputs: Record<string, unknown>): string {
        const fixture = renderComponent(PendingExpensesNoticeComponent, inputs, [provideRouter([])]);

        return ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');
    }

    it('sem compras pendentes, não mostra nada', () => {
        expect(textOf({ pending: { amount: '0.00', count: 0 } }).trim()).toBe('');
    });

    it('mostra quantas são, a soma e o link para as faturas', () => {
        const text = textOf({ pending: { amount: '1234.50', count: 1 } });

        expect(text).toContain('1 compra do cartão sem pessoa');
        expect(text).toContain('1.234,50');
        expect(text).toContain('Elas entram como compartilhadas');
        expect(text).toContain('Classificar nas faturas');
    });

    it('no resumo do ano, fala do ano todo', () => {
        const text = textOf({ pending: { amount: '10.00', count: 3 }, yearly: true });

        expect(text).toContain('3 compras do cartão sem pessoa');
        expect(text).toContain('No ano, elas entram como compartilhadas');
    });
});
