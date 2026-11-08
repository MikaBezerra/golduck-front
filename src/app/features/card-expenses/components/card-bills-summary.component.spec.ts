import { renderComponent } from '../../../../testing/components';
import { aBillSummaryItem } from '../../../../testing/fixtures';
import type { CreditCardBillsSummary } from '../../credit-cards/data-access/credit-card.models';
import { CardBillsSummaryComponent } from './card-bills-summary.component';

describe('CardBillsSummaryComponent (resumo das faturas no topo)', () => {
    const summary: CreditCardBillsSummary = {
        month: '2026-11',
        total: '1800.00',
        cards: [
            aBillSummaryItem({
                cardId: 'c6',
                cardName: 'C6',
                total: '1000.00',
                creditLimit: '5000.00',
                availableLimit: '3500.00',
            }),
            aBillSummaryItem({
                cardId: 'nu',
                cardName: 'Nubank',
                status: 'paid',
                total: '750.50',
                creditLimit: '500.00',
                availableLimit: '-100.00',
            }),
            aBillSummaryItem({ cardId: 'old', cardName: 'Antigo', active: false, total: '49.50' }),
        ],
    };

    function render(selectedCardId: string | null = 'c6') {
        const fixture = renderComponent(CardBillsSummaryComponent, { summary, selectedCardId }, []);
        const element = fixture.nativeElement as HTMLElement;
        const buttons = Array.from(element.querySelectorAll('button'));

        return { fixture, element, buttons };
    }

    it('mostra o total geral e, por cartão, total, situação e limite disponível', () => {
        const { element } = render();
        const text = element.textContent ?? '';

        expect(text).toContain('Total geral');
        expect(text).toMatch(/R\$\s1\.800,00/);
        expect(text).toContain('Fechada · a pagar');
        expect(text).toMatch(/Disponível R\$\s3\.500,00 de R\$\s5\.000,00/);
        expect(text).toMatch(/Limite estourado em R\$\s100,00/);
        expect(text).toContain('Sem limite cadastrado');
        expect(text).toContain('(inativo)');
        expect(text).toContain('O disponível é o de hoje');
    });

    it('o cartão da tela fica marcado; clicar escolhe outro; o inativo não é clicável', () => {
        const { fixture, buttons } = render();
        const chosen: string[] = [];
        fixture.componentInstance.cardSelected.subscribe((id) => chosen.push(id));

        expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
        expect(buttons[2].disabled).toBe(true);

        buttons[1].click();

        expect(chosen).toEqual(['nu']);
    });

    it('sem nenhum limite cadastrado, não mostra a explicação do disponível', () => {
        const fixture = renderComponent(
            CardBillsSummaryComponent,
            { summary: { ...summary, cards: [aBillSummaryItem()] } },
            [],
        );

        expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('O disponível é o de hoje');
    });
});
