import { renderComponent } from '../../../../testing/components';
import { aCardSync } from '../../../../testing/fixtures';
import type { CardSyncResult } from '../data-access/card-sync.models';
import { CardSyncResultComponent } from './card-sync-result.component';

const OK: CardSyncResult = {
    cardId: 'card-1',
    cardName: 'C6',
    summary: { created: 2, updated: 0, unchanged: 4, removed: 1, replacedManual: 0, ignored: 0 },
    error: null,
    sync: aCardSync(),
};

const FAILED: CardSyncResult = {
    cardId: 'card-2',
    cardName: 'Neon',
    summary: null,
    error: { code: 'PLUGGY_UNAVAILABLE', message: 'A Pluggy não respondeu.' },
    sync: aCardSync(),
};

describe('CardSyncResultComponent', () => {
    function render(results: CardSyncResult[]) {
        const fixture = renderComponent(CardSyncResultComponent, { results }, []);
        const dismissed = vi.fn();
        fixture.componentInstance.dismissed.subscribe(dismissed);

        return { fixture, dismissed, text: (fixture.nativeElement as HTMLElement).textContent ?? '' };
    }

    it('um cartão: o resumo, sem repetir o nome', () => {
        const { text } = render([OK]);

        expect(text).toContain('Sincronização concluída');
        expect(text).toContain('2 linhas criadas');
        expect(text).toContain('1 linha removida');
        expect(text).not.toContain('C6');
    });

    it('vários cartões: nome de cada um, o erro de quem falhou e a dica', () => {
        const { text } = render([OK, FAILED]);

        expect(text).toContain('Sincronização com problemas');
        expect(text).toContain('C6');
        expect(text).toContain('Neon');
        expect(text).toContain('A Pluggy não respondeu.');
        expect(text).toContain('Enviar fatura');
    });

    it('nenhum cartão configurado', () => {
        expect(render([]).text).toContain('Nenhum cartão com a sincronização configurada.');
    });

    it('o botão de fechar avisa a página', () => {
        const { fixture, dismissed } = render([OK]);
        const button = (fixture.nativeElement as HTMLElement).querySelector('button');

        button?.click();

        expect(dismissed).toHaveBeenCalled();
    });
});
