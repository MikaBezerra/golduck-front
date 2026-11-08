import { cardSyncErrorHint, type CardSyncSummary, describeSyncSummary } from './card-sync.models';

const NOTHING: CardSyncSummary = { created: 0, updated: 0, unchanged: 3, removed: 0, replacedManual: 0, ignored: 0 };

describe('card-sync.models', () => {
    it('descreve só o que aconteceu, no singular e no plural', () => {
        expect(describeSyncSummary({ ...NOTHING, created: 2, updated: 1, removed: 1, replacedManual: 1 })).toEqual([
            '2 linhas criadas (compras novas e parcelas)',
            '1 linha alterada',
            '1 linha removida (compra que sumiu ou mudou de fatura)',
            '1 compra adicionada à mão foi substituída pela do banco',
        ]);
        expect(describeSyncSummary({ ...NOTHING, created: 1, updated: 3, removed: 2, replacedManual: 2 })).toEqual([
            '1 linha criada (compras novas e parcelas)',
            '3 linhas alteradas',
            '2 linhas removidas (compra que sumiu ou mudou de fatura)',
            '2 compras adicionadas à mão foram substituídas pelas do banco',
        ]);
    });

    it('sem mudanças, diz que já estava em dia; os ignorados aparecem à parte', () => {
        expect(describeSyncSummary(NOTHING)).toEqual(['Nada mudou: as faturas já estavam em dia.']);
        expect(describeSyncSummary({ ...NOTHING, ignored: 2 })).toEqual([
            'Nada mudou: as faturas já estavam em dia.',
            '2 lançamentos ignorados (pagamentos e estornos)',
        ]);
        expect(describeSyncSummary({ ...NOTHING, ignored: 1 })[1]).toBe(
            '1 lançamento ignorado (pagamentos e estornos)',
        );
    });

    it('dá uma dica do que fazer para os erros conhecidos', () => {
        expect(cardSyncErrorHint('CARD_SYNC_NOT_CONFIGURED')).toContain('Cartões');
        expect(cardSyncErrorHint('PLUGGY_UNAVAILABLE')).toContain('Enviar fatura');
        expect(cardSyncErrorHint('OUTRO')).toBeNull();
    });
});
