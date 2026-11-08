import type { Signal } from '@angular/core';
import type { FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { apiError, internals, openDialog } from '../../../../testing/components';
import { aManualExpense, aPerson } from '../../../../testing/fixtures';
import { lookupsWith } from '../../../../testing/lookups';
import { notificationsMock } from '../../../../testing/mocks';
import { ExpenseLookupsService } from '../data-access/expense-lookups.service';
import type { ManualExpense } from '../data-access/manual-expense.models';
import { ManualExpenseService } from '../data-access/manual-expense.service';
import { ExpenseFormDialogComponent } from './expense-form-dialog.component';

interface Internals {
    readonly form: FormGroup;
    readonly replicateCount: Signal<number>;
    readonly personOptions: Signal<{ label: string; value: string }[]>;
    save(): void;
}

describe('ExpenseFormDialogComponent', () => {
    const expenses = { create: vi.fn(), updateMany: vi.fn() };
    const notifications = notificationsMock();
    const people = [aPerson({ id: 'p-ana', name: 'Ana' }), aPerson({ id: 'p-bia', name: 'Bia', active: false })];

    function open(expense: ManualExpense | null = null) {
        expenses.create.mockReset();
        expenses.updateMany.mockReset();
        Object.values(notifications).forEach((mock) => mock.mockReset());

        const fixture = openDialog(ExpenseFormDialogComponent, { expense, defaultMonth: '2026-10' }, [
            { provide: ManualExpenseService, useValue: expenses },
            { provide: NotificationService, useValue: notifications },
            { provide: ExpenseLookupsService, useValue: lookupsWith([], people) },
        ]);

        return { fixture, dialog: internals<Internals>(fixture) };
    }

    it('abre no mês sugerido, sem campo de categoria (só as compras do cartão têm)', () => {
        const { fixture, dialog } = open();
        const value = dialog.form.getRawValue();

        expect((value.month as Date).getMonth()).toBe(9);
        expect(value).not.toHaveProperty('categoryId');
        expect(document.body.textContent).not.toContain('Categoria');
        expect(fixture.componentInstance.visible()).toBe(true);
        expect(value.personId).toBeNull();
        expect(value.replicate).toBe(false);
    });

    it('a pessoa é obrigatória: "Compartilhada" vem antes das pessoas', () => {
        const { dialog } = open();

        expect(dialog.personOptions()).toEqual([
            { label: 'Compartilhada', value: 'SHARED' },
            { label: 'Ana', value: 'p-ana' },
        ]);

        dialog.form.patchValue({ title: 'Luz', amount: 150 });
        dialog.save();

        expect(expenses.create).not.toHaveBeenCalled();
        expect(dialog.form.get('personId')?.hasError('required')).toBe(true);
    });

    it('conta quantos meses a réplica vai criar (do mês escolhido até dezembro)', () => {
        const { dialog } = open();

        expect(dialog.replicateCount()).toBe(3);

        dialog.form.get('month')?.setValue(new Date(2026, 0, 1));
        expect(dialog.replicateCount()).toBe(12);
    });

    it('lança uma despesa nova com a réplica e mostra quantas foram criadas', () => {
        const { fixture, dialog } = open();
        expenses.create.mockReturnValue(of([aManualExpense(), aManualExpense(), aManualExpense()]));

        dialog.form.patchValue({ title: ' Internet ', amount: 99.9, personId: 'p-ana', replicate: true });
        dialog.save();

        expect(expenses.create).toHaveBeenCalledWith({
            month: '2026-10',
            title: 'Internet',
            amount: '99.90',
            split: 'PERSONAL',
            personId: 'p-ana',
            replicateUntilYearEnd: true,
        });
        expect(notifications.success).toHaveBeenCalledWith('Despesa lançada em 3 meses.');
        expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('compartilhada e sem réplica: manda split SHARED, sem pessoa nem réplica', () => {
        const { dialog } = open();
        expenses.create.mockReturnValue(of([aManualExpense()]));

        dialog.form.patchValue({ title: 'Luz', amount: 150, personId: 'SHARED' });
        dialog.save();

        expect(expenses.create).toHaveBeenCalledWith({
            month: '2026-10',
            title: 'Luz',
            amount: '150.00',
            split: 'SHARED',
        });
        expect(notifications.success).toHaveBeenCalledWith('Despesa lançada.');
    });

    it('não envia sem título ou com valor zerado', () => {
        const { dialog } = open();

        dialog.form.patchValue({ title: '  ', amount: 0 });
        dialog.save();

        expect(expenses.create).not.toHaveBeenCalled();
        expect(dialog.form.get('title')?.hasError('required')).toBe(true);
        expect(dialog.form.get('amount')?.hasError('min')).toBe(true);
    });

    it('na edição, trava o mês e envia só o que mudou', () => {
        const current = aManualExpense({ id: 'expense-5', title: 'Aluguel', amount: '1500.00' });
        const { dialog } = open(current);
        expenses.updateMany.mockReturnValue(of([current]));

        expect(dialog.form.get('month')?.disabled).toBe(true);
        expect(dialog.form.get('personId')?.value).toBe('SHARED');

        dialog.form.patchValue({ amount: 1600, personId: 'p-ana' });
        dialog.save();

        expect(expenses.updateMany).toHaveBeenCalledWith({
            ids: ['expense-5'],
            changes: { amount: '1600.00', split: 'PERSONAL', personId: 'p-ana' },
        });
        expect(notifications.success).toHaveBeenCalledWith('Despesa atualizada.');
    });

    it('na edição sem mudanças, só avisa e fecha', () => {
        const { fixture, dialog } = open(aManualExpense());

        dialog.save();

        expect(expenses.updateMany).not.toHaveBeenCalled();
        expect(notifications.info).toHaveBeenCalledWith('Nada foi alterado.');
        expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('mantém visível a pessoa desativada da despesa sendo editada', () => {
        const { dialog } = open(aManualExpense({ personId: 'p-bia' }));

        expect(dialog.personOptions()).toContainEqual({ label: 'Bia (desativada)', value: 'p-bia' });
    });

    it('erros do back com código conhecido vão para o campo; os de "changes.*" também', () => {
        const { dialog } = open();
        dialog.form.patchValue({ title: 'Luz', amount: 150, personId: 'SHARED' });

        expenses.create.mockReturnValue(apiError(409, 'MANUAL_EXPENSE_INACTIVE_PERSON', 'Pessoa desativada'));
        dialog.save();
        expect(dialog.form.get('personId')?.getError('server')).toBe('Pessoa desativada');

        const editing = open(aManualExpense()).dialog;
        expenses.updateMany.mockReturnValue(
            apiError(400, 'VALIDATION_ERROR', 'Inválido', [
                { field: 'changes.title', code: 'string.max', message: 'Título longo demais' },
            ]),
        );
        editing.form.patchValue({ title: 'Outro título' });
        editing.save();
        expect(editing.form.get('title')?.getError('server')).toBe('Título longo demais');
        expect(notifications.error).not.toHaveBeenCalled();
    });
});
