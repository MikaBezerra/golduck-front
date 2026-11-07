import { BrlPipe } from './money/brl.pipe';
import { MonthPipe } from './month/month.pipe';
import { PhonePipe } from './phone/phone.pipe';

/** Os pipes só formatam para a tela; vazio sempre vira "—". */
describe('pipes de exibição', () => {
    it('brl formata em reais e mostra "—" sem valor', () => {
        const pipe = new BrlPipe();

        expect(pipe.transform('1234.56').replace(/\s/g, ' ')).toBe('R$ 1.234,56');
        expect(pipe.transform('-10.00').replace(/\s/g, ' ')).toBe('-R$ 10,00');
        expect(pipe.transform(null)).toBe('—');
        expect(pipe.transform(undefined)).toBe('—');
    });

    it('month mostra o mês por extenso ou curto', () => {
        const pipe = new MonthPipe();

        expect(pipe.transform('2026-11')).toBe('Novembro de 2026');
        expect(pipe.transform('2026-11', 'short')).toBe('nov/2026');
        expect(pipe.transform(null)).toBe('—');
        expect(pipe.transform('')).toBe('—');
    });

    it('phone formata o celular e mostra "—" sem número', () => {
        const pipe = new PhonePipe();

        expect(pipe.transform('+5511999999999')).toBe('+55 (11) 99999-9999');
        expect(pipe.transform(null)).toBe('—');
        expect(pipe.transform('')).toBe('—');
    });
});
