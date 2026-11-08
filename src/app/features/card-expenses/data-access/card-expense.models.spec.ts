import { aCardExpense } from '../../../../testing/fixtures';
import { canMoveCardExpense } from './card-expense.models';

describe('card-expense.models', () => {
    it('só compras de upload não mudam de fatura', () => {
        expect(canMoveCardExpense(aCardExpense({ origin: 'SYNC' }))).toBe(true);
        expect(canMoveCardExpense(aCardExpense({ origin: 'MANUAL' }))).toBe(true);
        expect(canMoveCardExpense(aCardExpense({ origin: 'UPLOAD' }))).toBe(false);
    });
});
