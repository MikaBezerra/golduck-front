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

    it('na pré-visualização, descreve o que vai acontecer ao salvar', () => {
        expect(
            describeImportSummary({ created: 2, updated: 1, removed: 1, projected: 3, ignored: 0 }, 'preview'),
        ).toEqual([
            '2 compras novas',
            '1 compra já lançada será atualizada',
            '1 despesa será removida (não estão no arquivo)',
            '3 parcelas futuras serão lançadas nos próximos meses',
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
