import { FormArray, FormControl, FormGroup } from '@angular/forms';

import { ApiError } from '../../core/api/api-error';
import { applyServerErrors } from './form-errors';

describe('applyServerErrors', () => {
    const validationError = new ApiError(400, 'VALIDATION_ERROR', 'Os dados enviados são inválidos', 'req', [
        { field: 'name', code: 'string.max', message: 'Nome muito longo' },
        { field: 'months[1]', code: 'number.max', message: 'Mês inválido' },
        { field: 'changes.amount', code: 'string.pattern.base', message: 'Valor inválido' },
    ]);

    it('encaixa cada erro no campo correspondente', () => {
        const form = new FormGroup({
            name: new FormControl(''),
            months: new FormControl<number[]>([]),
            amount: new FormControl<number | null>(null),
        });

        const applied = applyServerErrors(form, validationError, { 'changes.amount': 'amount' });

        expect(applied).toBe(true);
        expect(form.controls.name.errors).toEqual({ server: 'Nome muito longo' });
        expect(form.controls.months.errors).toEqual({ server: 'Mês inválido' });
        expect(form.controls.amount.errors).toEqual({ server: 'Valor inválido' });
        expect(form.controls.name.touched).toBe(true);
    });

    it('encaixa erros de listas na linha certa do FormArray', () => {
        const form = new FormGroup({
            transactions: new FormArray([
                new FormGroup({ amount: new FormControl('') }),
                new FormGroup({ amount: new FormControl('') }),
            ]),
        });
        const error = new ApiError(400, 'VALIDATION_ERROR', 'Os dados enviados são inválidos', 'req', [
            { field: 'transactions[1].amount', code: 'string.pattern.base', message: 'Valor inválido' },
        ]);

        expect(applyServerErrors(form, error)).toBe(true);
        expect(form.controls.transactions.at(0).controls.amount.errors).toBeNull();
        expect(form.controls.transactions.at(1).controls.amount.errors).toEqual({ server: 'Valor inválido' });
    });

    it('avisa quando nenhum campo foi encontrado', () => {
        const form = new FormGroup({ other: new FormControl('') });

        expect(applyServerErrors(form, validationError)).toBe(false);
    });
});
