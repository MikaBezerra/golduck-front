import type { Signal } from '@angular/core';
import { type Observable, of, throwError } from 'rxjs';

import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { internals, openDialog } from '../../../../testing/components';
import { aCreditCard } from '../../../../testing/fixtures';
import { confirmMock, type ConfirmMock, notificationsMock } from '../../../../testing/mocks';
import type { CardImport } from '../data-access/card-import.models';
import { CardImportService } from '../data-access/card-import.service';
import { CardImportHistoryDialogComponent } from './card-import-history-dialog.component';

interface Internals {
    readonly imports: Signal<CardImport[]>;
    readonly loading: Signal<boolean>;
    remove(cardImport: CardImport): Promise<void>;
}

const UPLOAD: CardImport = {
    id: 'import-1',
    cardId: 'card-1',
    month: '2026-11',
    fileName: 'fatura.csv',
    parserVersion: 'nubank-csv@1',
    rowCount: 3,
    ignoredCount: 0,
    expenseCount: 3,
    createdAt: '2026-11-01T12:00:00.000Z',
};

describe('CardImportHistoryDialogComponent (histórico de envios)', () => {
    const cardImports = { findAll: vi.fn(), delete: vi.fn() };
    const notifications = notificationsMock();
    let confirm: ConfirmMock;

    function open(confirmAnswer = true, list: Observable<CardImport[]> = of([UPLOAD])) {
        cardImports.findAll.mockReset().mockReturnValue(list);
        cardImports.delete.mockReset();
        Object.values(notifications).forEach((mock) => mock.mockReset());
        confirm = confirmMock(confirmAnswer);

        const fixture = openDialog(CardImportHistoryDialogComponent, { card: aCreditCard({ id: 'card-1' }) }, [
            { provide: CardImportService, useValue: cardImports },
            { provide: NotificationService, useValue: notifications },
            { provide: ConfirmService, useValue: confirm },
        ]);
        const changed = vi.fn();
        fixture.componentInstance.changed.subscribe(changed);

        return { dialog: internals<Internals>(fixture), changed };
    }

    it('ao abrir, lista os envios do cartão', () => {
        const { dialog } = open();

        expect(cardImports.findAll).toHaveBeenCalledWith({ cardId: 'card-1' });
        expect(dialog.imports()).toEqual([UPLOAD]);
        expect(dialog.loading()).toBe(false);
    });

    it('exclui um envio depois de confirmar (avisando que nada é restaurado) e recarrega', async () => {
        const { dialog, changed } = open();
        cardImports.delete.mockReturnValue(of(undefined));

        await dialog.remove(UPLOAD);

        expect(confirm.danger).toHaveBeenCalledWith(
            expect.objectContaining({
                header: 'Excluir envio',
                message: expect.stringContaining('As 3 despesas gravadas por ele serão apagadas') as string,
            }),
        );
        expect(cardImports.delete).toHaveBeenCalledWith('import-1');
        expect(notifications.success).toHaveBeenCalledWith('Envio excluído.');
        expect(changed).toHaveBeenCalled();
        expect(cardImports.findAll).toHaveBeenCalledTimes(2);
    });

    it('não exclui se o usuário cancelar', async () => {
        const { dialog } = open(false);

        await dialog.remove(UPLOAD);

        expect(cardImports.delete).not.toHaveBeenCalled();
    });

    it('avisa se a lista não carregar', () => {
        const error = new Error('falhou');

        const { dialog } = open(
            true,
            throwError(() => error),
        );

        expect(notifications.error).toHaveBeenCalledWith(error);
        expect(dialog.loading()).toBe(false);
    });
});
