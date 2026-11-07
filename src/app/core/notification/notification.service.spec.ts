import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';

import { ApiError } from '../api/api-error';
import { LOG_LEVEL } from '../logging/logger.service';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
    let notifications: NotificationService;
    let add: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        add = vi.fn();
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        TestBed.configureTestingModule({
            providers: [
                { provide: MessageService, useValue: { add } },
                { provide: LOG_LEVEL, useValue: 'warn' },
            ],
        });
        notifications = TestBed.inject(NotificationService);
    });

    afterEach(() => vi.restoreAllMocks());

    it('mostra o código de suporte e loga o id completo', () => {
        notifications.error(new ApiError(500, 'INTERNAL_ERROR', 'Erro interno', 'abcdef12-3456-7890'));

        expect(add.mock.calls[0][0].detail).toBe('Erro interno (código de suporte: abcdef12)');
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Erro interno'),
            expect.any(String),
            '',
            expect.objectContaining({ requestId: 'abcdef12-3456-7890' }),
        );
    });

    it('várias falhas iguais ao mesmo tempo viram um aviso só; 401 não mostra aviso', () => {
        const limit = ApiError.tooManyRequests(30, 'req-12345678');

        notifications.error(limit);
        notifications.error(limit);
        notifications.error(limit);
        notifications.error(new ApiError(401, 'UNAUTHENTICATED', 'Sessão expirada'));
        notifications.error(new ApiError(409, 'CONFLICT', 'Já existe'));

        expect(add).toHaveBeenCalledTimes(2);
        expect(add.mock.calls[1][0].detail).toBe('Já existe');
    });
});
