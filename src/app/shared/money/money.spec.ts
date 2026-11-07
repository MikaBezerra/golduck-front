import { amountToCents, amountToNumber, centsToAmount, formatBrl, numberToAmount, sumAmounts } from './money';

describe('money', () => {
    it('converte o formato da API para centavos', () => {
        expect(amountToCents('1234.56')).toBe(123456);
        expect(amountToCents('10')).toBe(1000);
        expect(amountToCents('10.5')).toBe(1050);
        expect(amountToCents('-3.07')).toBe(-307);
    });

    it('recusa formatos inesperados', () => {
        expect(() => amountToCents('1.234,56')).toThrow();
        expect(() => amountToCents('abc')).toThrow();
    });

    it('converte centavos para o formato da API', () => {
        expect(centsToAmount(123456)).toBe('1234.56');
        expect(centsToAmount(5)).toBe('0.05');
        expect(centsToAmount(-307)).toBe('-3.07');
    });

    it('soma sem erro de ponto flutuante', () => {
        expect(sumAmounts(['0.10', '0.20'])).toBe('0.30');
        expect(sumAmounts([])).toBe('0.00');
    });

    it('converte entre o campo numérico e a API', () => {
        expect(numberToAmount(1234.56)).toBe('1234.56');
        expect(numberToAmount(0.1 + 0.2)).toBe('0.30');
        expect(numberToAmount(10)).toBe('10.00');
        expect(amountToNumber('1234.56')).toBe(1234.56);
    });

    it('formata em reais', () => {
        expect(formatBrl('1234.56').replace(/\s/g, ' ')).toBe('R$ 1.234,56');
    });
});
