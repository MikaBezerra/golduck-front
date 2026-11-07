import { FormControl } from '@angular/forms';

import { MONEY_ERROR_MESSAGES, MONEY_MAX, moneyValidators } from './money-input';

describe('validação do campo de valor', () => {
    const control = (value: number | null): FormControl<number | null> => new FormControl(value, moneyValidators);

    it('exige um valor maior que zero e dentro do limite', () => {
        expect(control(null).errors).toHaveProperty('required');
        expect(control(0).errors).toHaveProperty('min');
        expect(control(MONEY_MAX + 1).errors).toHaveProperty('max');
        expect(control(0.01).valid).toBe(true);
        expect(control(MONEY_MAX).valid).toBe(true);
    });

    it('tem mensagem em português para cada erro', () => {
        for (const key of ['required', 'min', 'max']) {
            expect(MONEY_ERROR_MESSAGES[key]).toBeTruthy();
        }
    });
});
