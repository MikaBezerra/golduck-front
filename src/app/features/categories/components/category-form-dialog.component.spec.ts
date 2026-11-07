import type { FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { apiError, internals, openDialog } from '../../../../testing/components';
import { aCategory } from '../../../../testing/fixtures';
import { notificationsMock } from '../../../../testing/mocks';
import type { Category } from '../data-access/category.models';
import { CategoryService } from '../data-access/category.service';
import { CategoryFormDialogComponent } from './category-form-dialog.component';

interface Internals {
    readonly form: FormGroup;
    save(): void;
}

describe('CategoryFormDialogComponent', () => {
    const categories = { create: vi.fn(), update: vi.fn() };
    const notifications = notificationsMock();

    function open(category: Category | null = null) {
        categories.create.mockReset();
        categories.update.mockReset();
        Object.values(notifications).forEach((mock) => mock.mockReset());

        const fixture = openDialog(CategoryFormDialogComponent, { category }, [
            { provide: CategoryService, useValue: categories },
            { provide: NotificationService, useValue: notifications },
        ]);
        const saved = vi.fn();
        fixture.componentInstance.saved.subscribe(saved);

        return { fixture, form: internals<Internals>(fixture), saved };
    }

    it('abre vazio para criar e com o nome atual para renomear', () => {
        expect(open().form.form.getRawValue()).toEqual({ name: '' });
        expect(open(aCategory({ name: 'Mercado' })).form.form.getRawValue()).toEqual({ name: 'Mercado' });
    });

    it('não envia nome só com espaços', () => {
        const { form } = open();

        form.form.setValue({ name: '   ' });
        form.save();

        expect(categories.create).not.toHaveBeenCalled();
        expect(form.form.get('name')?.hasError('required')).toBe(true);
    });

    it('cria com o nome sem espaços nas pontas, avisa e fecha', () => {
        const { fixture, form, saved } = open();
        categories.create.mockReturnValue(of(aCategory({ name: 'Farmácia' })));

        form.form.setValue({ name: '  Farmácia ' });
        form.save();

        expect(categories.create).toHaveBeenCalledWith({ name: 'Farmácia' });
        expect(notifications.success).toHaveBeenCalledWith('Categoria criada.');
        expect(saved).toHaveBeenCalled();
        expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('renomeia a categoria aberta', () => {
        const { form } = open(aCategory({ id: 'category-4', name: 'Feira' }));
        categories.update.mockReturnValue(of(aCategory({ name: 'Hortifruti' })));

        form.form.setValue({ name: 'Hortifruti' });
        form.save();

        expect(categories.update).toHaveBeenCalledWith('category-4', { name: 'Hortifruti' });
        expect(notifications.success).toHaveBeenCalledWith('Categoria renomeada.');
    });

    it('nome repetido (CATEGORY_NAME_CONFLICT) aparece embaixo do campo, sem toast', () => {
        const { form } = open();
        categories.create.mockReturnValue(
            apiError(409, 'CATEGORY_NAME_CONFLICT', 'Já existe uma categoria com esse nome'),
        );

        form.form.setValue({ name: 'Mercado' });
        form.save();

        expect(form.form.get('name')?.getError('server')).toBe('Já existe uma categoria com esse nome');
        expect(notifications.error).not.toHaveBeenCalled();
    });

    it('outros erros viram aviso', () => {
        const { form } = open();
        categories.create.mockReturnValue(apiError(500, 'INTERNAL_ERROR', 'Erro interno do servidor'));

        form.form.setValue({ name: 'Mercado' });
        form.save();

        expect(notifications.error).toHaveBeenCalled();
    });
});
