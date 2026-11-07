import { TestBed } from '@angular/core/testing';
import { type Confirmation, ConfirmationService } from 'primeng/api';

import { ConfirmService } from './confirm.service';

describe('ConfirmService', () => {
    function setup(answer: 'accept' | 'reject'): { confirm: ConfirmService; shown: Confirmation[] } {
        const shown: Confirmation[] = [];
        const confirmation = {
            confirm: (options: Confirmation) => {
                shown.push(options);
                (answer === 'accept' ? options.accept : options.reject)?.();
            },
        };

        TestBed.configureTestingModule({ providers: [{ provide: ConfirmationService, useValue: confirmation }] });

        return { confirm: TestBed.inject(ConfirmService), shown };
    }

    it('mostra o aviso de perigo com foco em "Cancelar" e resolve true ao confirmar', async () => {
        const { confirm, shown } = setup('accept');

        await expect(
            confirm.danger({ header: 'Excluir', message: 'Tem certeza?', acceptLabel: 'Excluir' }),
        ).resolves.toBe(true);

        expect(shown[0]).toMatchObject({
            header: 'Excluir',
            message: 'Tem certeza?',
            acceptLabel: 'Excluir',
            rejectLabel: 'Cancelar',
            defaultFocus: 'reject',
            acceptButtonProps: { severity: 'danger' },
        });
    });

    it('resolve false ao cancelar', async () => {
        const { confirm } = setup('reject');

        await expect(confirm.danger({ header: 'Excluir', message: '?', acceptLabel: 'Excluir' })).resolves.toBe(false);
    });
});
