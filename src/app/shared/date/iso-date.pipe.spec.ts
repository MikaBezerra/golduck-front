import { IsoDatePipe } from './iso-date.pipe';

describe('IsoDatePipe', () => {
    const pipe = new IsoDatePipe();

    it('formata sem mudar o dia por causa do fuso horário', () => {
        expect(pipe.transform('2026-11-03')).toBe('03/11/2026');
        expect(pipe.transform('2026-11-01', 'short')).toBe('01/11');
    });

    it('lida com vazio e formatos inesperados', () => {
        expect(pipe.transform(null)).toBe('—');
        expect(pipe.transform('03/11/2026')).toBe('03/11/2026');
    });
});
