import { of, throwError } from 'rxjs';

import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { internals, renderComponent } from '../../../../testing/components';
import { aCategory } from '../../../../testing/fixtures';
import { confirmMock, type ConfirmMock, notificationsMock, type NotificationsMock } from '../../../../testing/mocks';
import type { Category } from '../data-access/category.models';
import { CategoryService } from '../data-access/category.service';
import { CategoriesPageComponent } from './categories-page.component';

interface Internals {
    remove(category: Category): Promise<void>;
}

/* Listar, desativar e reativar estão em registry-pages.spec.ts; aqui, a exclusão. */
describe('CategoriesPageComponent (excluir categoria)', () => {
    const feira = aCategory({ id: 'c-feira', name: 'Feira' });
    const outros = aCategory({ id: 'c-outros', name: 'Outros', isDefault: true });
    let service: { findAll: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
    let notifications: NotificationsMock;
    let confirm: ConfirmMock;

    function render(confirmAnswer = true) {
        service = { findAll: vi.fn(() => of([feira, outros])), delete: vi.fn() };
        notifications = notificationsMock();
        confirm = confirmMock(confirmAnswer);

        const fixture = renderComponent(CategoriesPageComponent, {}, [
            { provide: CategoryService, useValue: service },
            { provide: NotificationService, useValue: notifications },
            { provide: ConfirmService, useValue: confirm },
        ]);
        const element = fixture.nativeElement as HTMLElement;

        return { page: internals<Internals>(fixture), element };
    }

    it('só as categorias que não são a padrão têm o botão Excluir', () => {
        const { element } = render();

        expect(element.querySelector('[aria-label="Excluir Feira"]')).not.toBeNull();
        expect(element.querySelector('[aria-label="Excluir Outros"]')).toBeNull();
    });

    it('exclui depois de confirmar, diz para onde foram as despesas e recarrega', async () => {
        const { page } = render();
        service.delete.mockReturnValue(of({ movedTo: outros, movedManualExpenses: 1, movedCardExpenses: 2 }));

        await page.remove(feira);

        expect(confirm.danger).toHaveBeenCalledWith(expect.objectContaining({ header: 'Excluir categoria' }));
        expect(service.delete).toHaveBeenCalledWith('c-feira');
        expect(notifications.success).toHaveBeenCalledWith(
            'Categoria "Feira" excluída. 3 despesas foram para "Outros".',
        );
        expect(service.findAll).toHaveBeenCalledTimes(2);
    });

    it('cancelar não exclui; erro do back vira aviso', async () => {
        const cancelled = render(false);
        await cancelled.page.remove(feira);
        expect(service.delete).not.toHaveBeenCalled();

        const failing = render();
        const error = new Error('falhou');
        service.delete.mockReturnValue(throwError(() => error));
        await failing.page.remove(feira);
        expect(notifications.error).toHaveBeenCalledWith(error);
    });
});
