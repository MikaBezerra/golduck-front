import { FormControl } from '@angular/forms';

import { formatPhone, normalizePhone, phoneValidator } from './phone';

describe('phone', () => {
    it('converte números brasileiros digitados com máscara', () => {
        expect(normalizePhone('(11) 99999-9999')).toBe('+5511999999999');
        expect(normalizePhone('11 3333 4444')).toBe('+551133334444');
        expect(normalizePhone('+55 11 99999-9999')).toBe('+5511999999999');
    });

    it('mantém números internacionais', () => {
        expect(normalizePhone('+1 415 555 2671')).toBe('+14155552671');
    });

    it('trata vazio como sem telefone', () => {
        expect(normalizePhone('   ')).toBeNull();
        expect(phoneValidator(new FormControl(''))).toBeNull();
    });

    it('recusa números impossíveis', () => {
        expect(phoneValidator(new FormControl('123'))).toEqual({ phone: true });
        expect(phoneValidator(new FormControl('+0 11 99999'))).toEqual({ phone: true });
    });

    it('formata para exibição', () => {
        expect(formatPhone('+5511999999999')).toBe('+55 (11) 99999-9999');
        expect(formatPhone('+551133334444')).toBe('+55 (11) 3333-4444');
        expect(formatPhone('+14155552671')).toBe('+14155552671');
    });
});
