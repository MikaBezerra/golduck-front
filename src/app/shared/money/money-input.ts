import { Validators } from '@angular/forms';

/**
 * Limites do campo de valor em reais (`p-inputnumber`).
 * O back aceita valores bem maiores, mas acima de ~90 trilhões o `number` do
 * JavaScript perde precisão nos centavos; 100 bilhões é folga suficiente.
 */
export const MONEY_MIN = 0.01;
export const MONEY_MAX = 99_999_999_999.99;

export const moneyValidators = [Validators.required, Validators.min(MONEY_MIN), Validators.max(MONEY_MAX)];

export const MONEY_ERROR_MESSAGES: Readonly<Record<string, string>> = {
    required: 'Informe o valor',
    min: 'O valor precisa ser maior que zero',
    max: 'Valor alto demais',
};
