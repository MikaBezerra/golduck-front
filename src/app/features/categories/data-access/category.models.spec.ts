import { aCategory } from '../../../../testing/fixtures';
import { describeMovedExpenses } from './category.models';

describe('describeMovedExpenses (aviso depois de excluir uma categoria)', () => {
    const movedTo = aCategory({ id: 'outros', name: 'Outros', isDefault: true });

    it('soma as despesas fora do cartão e as compras do cartão', () => {
        expect(describeMovedExpenses({ movedTo, movedManualExpenses: 2, movedCardExpenses: 3 })).toBe(
            '5 despesas foram para "Outros".',
        );
    });

    it('singular e nenhuma', () => {
        expect(describeMovedExpenses({ movedTo, movedManualExpenses: 0, movedCardExpenses: 1 })).toBe(
            '1 despesa foi para "Outros".',
        );
        expect(describeMovedExpenses({ movedTo, movedManualExpenses: 0, movedCardExpenses: 0 })).toBe(
            'Nenhuma despesa usava essa categoria.',
        );
    });
});
