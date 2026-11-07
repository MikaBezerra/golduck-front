import { describeImportSummary } from './card-import.models';

describe('describeImportSummary', () => {
    it('resume o envio em frases, no singular e no plural', () => {
        expect(describeImportSummary({ created: 4, updated: 1, removed: 0, projected: 4, ignored: 1 })).toEqual([
            '4 compras novas',
            '1 compra atualizada',
            '4 parcelas futuras lançadas nos próximos meses',
            '1 linha ignorada (pagamentos, estornos e créditos)',
        ]);
    });

    it('mostra remoções e omite o que não aconteceu', () => {
        expect(describeImportSummary({ created: 1, updated: 0, removed: 2, projected: 0, ignored: 0 })).toEqual([
            '1 compra nova',
            '0 compras atualizadas',
            '2 despesas removidas (não estavam na fatura)',
        ]);
    });
});
