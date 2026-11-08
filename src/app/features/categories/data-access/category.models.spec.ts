import { aCategory } from '../../../../testing/fixtures';
import { describeMovedPurchases } from './category.models';

describe('describeMovedPurchases (aviso depois de excluir uma categoria)', () => {
    const movedTo = aCategory({ id: 'outros', name: 'Outros', isDefault: true });

    it('conta as compras do cartão que foram para a padrão', () => {
        expect(describeMovedPurchases({ movedTo, movedCardExpenses: 5 })).toBe(
            '5 compras do cartão foram para "Outros".',
        );
    });

    it('singular e nenhuma', () => {
        expect(describeMovedPurchases({ movedTo, movedCardExpenses: 1 })).toBe('1 compra do cartão foi para "Outros".');
        expect(describeMovedPurchases({ movedTo, movedCardExpenses: 0 })).toBe(
            'Nenhuma compra do cartão usava essa categoria.',
        );
    });
});
