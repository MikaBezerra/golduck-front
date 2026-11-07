import {
    addMonths,
    currentMonthKey,
    formatMonth,
    formatMonthShort,
    isMonthKey,
    monthKeyToDate,
    parseMonthKey,
    toMonthKey,
} from './month';

describe('month', () => {
    it('valida e interpreta AAAA-MM', () => {
        expect(isMonthKey('2026-11')).toBe(true);
        expect(isMonthKey('2026-13')).toBe(false);
        expect(isMonthKey('2026-1')).toBe(false);
        expect(parseMonthKey('2026-03')).toEqual({ year: 2026, month: 3 });
        expect(toMonthKey(2026, 3)).toBe('2026-03');
    });

    it('avança e volta meses atravessando o ano', () => {
        expect(addMonths('2026-12', 1)).toBe('2027-01');
        expect(addMonths('2026-01', -1)).toBe('2025-12');
        expect(addMonths('2026-05', 14)).toBe('2027-07');
    });

    it('usa o mês local da data', () => {
        expect(currentMonthKey(new Date(2026, 10, 30, 23, 59))).toBe('2026-11');
        expect(monthKeyToDate('2026-11')).toEqual(new Date(2026, 10, 1));
    });

    it('formata para exibição', () => {
        expect(formatMonth('2026-03')).toBe('Março de 2026');
        expect(formatMonthShort('2026-03')).toBe('mar/2026');
    });
});
