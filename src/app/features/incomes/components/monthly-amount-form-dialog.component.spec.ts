import type { Signal } from '@angular/core';
import type { FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { apiError, internals, openDialog } from '../../../../testing/components';
import { anIncome, aReserve } from '../../../../testing/fixtures';
import { confirmMock, type ConfirmMock, notificationsMock } from '../../../../testing/mocks';
import { ReserveService } from '../../reserves/data-access/reserve.service';
import { IncomeService } from '../data-access/income.service';
import {
    type MonthlyAmount,
    type MonthlyAmountKind,
    MonthlyAmountFormDialogComponent,
} from './monthly-amount-form-dialog.component';

interface Internals {
    readonly form: FormGroup;
    readonly header: Signal<string>;
    readonly monthOptions: Signal<{ value: number; disabled: boolean }[]>;
    save(): void;
    remove(): Promise<void>;
}

describe('MonthlyAmountFormDialogComponent (entrada e reserva)', () => {
    const incomes = { create: vi.fn(), update: vi.fn(), delete: vi.fn() };
    const reserves = { create: vi.fn(), update: vi.fn(), delete: vi.fn() };
    const notifications = notificationsMock();
    let confirm: ConfirmMock;

    function open(
        options: {
            kind?: MonthlyAmountKind;
            entry?: MonthlyAmount | null;
            takenMonths?: number[];
            presetMonths?: number[];
            confirmAnswer?: boolean;
        } = {},
    ) {
        [incomes, reserves].forEach((service) => Object.values(service).forEach((mock) => mock.mockReset()));
        Object.values(notifications).forEach((mock) => mock.mockReset());
        confirm = confirmMock(options.confirmAnswer ?? true);

        const fixture = openDialog(
            MonthlyAmountFormDialogComponent,
            {
                kind: options.kind ?? 'income',
                year: 2026,
                entry: options.entry ?? null,
                takenMonths: options.takenMonths ?? [],
                presetMonths: options.presetMonths ?? [],
            },
            [
                { provide: IncomeService, useValue: incomes },
                { provide: ReserveService, useValue: reserves },
                { provide: NotificationService, useValue: notifications },
                { provide: ConfirmService, useValue: confirm },
            ],
        );
        const saved = vi.fn();
        fixture.componentInstance.saved.subscribe(saved);

        return { fixture, dialog: internals<Internals>(fixture), saved };
    }

    it('bloqueia os meses que já têm valor e começa com os meses pré-marcados', () => {
        const { dialog } = open({ takenMonths: [1, 2], presetMonths: [5] });

        expect(dialog.header()).toBe('Nova entrada');
        expect(
            dialog
                .monthOptions()
                .filter((option) => option.disabled)
                .map((option) => option.value),
        ).toEqual([1, 2]);
        expect(dialog.form.getRawValue()).toEqual({ months: [5], amount: null });
    });

    it('exige ao menos um mês e um valor maior que zero', () => {
        const { dialog } = open();

        dialog.form.setValue({ months: [], amount: 0 });
        dialog.save();

        expect(incomes.create).not.toHaveBeenCalled();
        expect(dialog.form.get('months')?.hasError('required')).toBe(true);
        expect(dialog.form.get('amount')?.hasError('min')).toBe(true);
    });

    it('cadastra a entrada nos meses escolhidos, em ordem, com o valor no formato da API', () => {
        const { fixture, dialog, saved } = open();
        incomes.create.mockReturnValue(of([anIncome()]));

        dialog.form.setValue({ months: [12, 3, 7], amount: 4500.5 });
        dialog.save();

        expect(incomes.create).toHaveBeenCalledWith({ year: 2026, months: [3, 7, 12], amount: '4500.50' });
        expect(notifications.success).toHaveBeenCalledWith('Entrada cadastrada em 3 meses.');
        expect(saved).toHaveBeenCalled();
        expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('com kind reserve usa o service de reservas e os textos de reserva', () => {
        const { dialog } = open({ kind: 'reserve' });
        reserves.create.mockReturnValue(of([aReserve()]));

        expect(dialog.header()).toBe('Nova reserva');

        dialog.form.setValue({ months: [11], amount: 300 });
        dialog.save();

        expect(reserves.create).toHaveBeenCalledWith({ year: 2026, months: [11], amount: '300.00' });
        expect(incomes.create).not.toHaveBeenCalled();
        expect(notifications.success).toHaveBeenCalledWith('Reserva cadastrada em 1 mês.');
    });

    it('na edição o mês fica travado e só o valor é alterado', () => {
        const { dialog } = open({ entry: { month: '2026-11', amount: '5000.00' } });
        incomes.update.mockReturnValue(of(anIncome()));

        expect(dialog.header()).toBe('Editar entrada');
        expect(dialog.form.get('months')?.disabled).toBe(true);
        expect(dialog.form.get('amount')?.value).toBe(5000);

        dialog.form.patchValue({ amount: 5200 });
        dialog.save();

        expect(incomes.update).toHaveBeenCalledWith('2026-11', { amount: '5200.00' });
        expect(notifications.success).toHaveBeenCalledWith('Entrada atualizada.');
    });

    it('mês já cadastrado e valor inválido aparecem nos campos certos', () => {
        const { dialog } = open();
        dialog.form.setValue({ months: [11], amount: 100 });

        incomes.create.mockReturnValue(apiError(409, 'INCOME_MONTH_CONFLICT', 'Já existe entrada em novembro'));
        dialog.save();
        expect(dialog.form.get('months')?.getError('server')).toBe('Já existe entrada em novembro');

        // O usuário troca o mês (o erro do back some) e tenta de novo.
        dialog.form.get('months')?.setValue([10]);
        incomes.create.mockReturnValue(apiError(400, 'INCOME_INVALID_AMOUNT', 'Valor inválido'));
        dialog.save();
        expect(dialog.form.get('amount')?.getError('server')).toBe('Valor inválido');

        expect(notifications.error).not.toHaveBeenCalled();
    });

    it('exclui depois de confirmar', async () => {
        const { dialog, saved } = open({ entry: { month: '2026-11', amount: '5000.00' } });
        incomes.delete.mockReturnValue(of(undefined));

        await dialog.remove();

        expect(confirm.danger).toHaveBeenCalledWith(
            expect.objectContaining({ header: 'Excluir entrada', acceptLabel: 'Excluir' }),
        );
        expect(incomes.delete).toHaveBeenCalledWith('2026-11');
        expect(notifications.success).toHaveBeenCalledWith('Entrada excluída.');
        expect(saved).toHaveBeenCalled();
    });

    it('não exclui se o usuário cancelar', async () => {
        const { dialog } = open({ entry: { month: '2026-11', amount: '5000.00' }, confirmAnswer: false });

        await dialog.remove();

        expect(incomes.delete).not.toHaveBeenCalled();
    });
});
