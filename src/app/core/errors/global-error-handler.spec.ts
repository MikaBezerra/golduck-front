import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';

import { ApiError } from '../api/api-error';
import { LOG_LEVEL } from '../logging/logger.service';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
    let handler: GlobalErrorHandler;
    let messages: { add: ReturnType<typeof vi.fn> };
    let consoleError: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        messages = { add: vi.fn() };
        consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        TestBed.configureTestingModule({
            providers: [
                GlobalErrorHandler,
                { provide: MessageService, useValue: messages },
                { provide: LOG_LEVEL, useValue: 'debug' },
            ],
        });
        handler = TestBed.inject(GlobalErrorHandler);
    });

    afterEach(() => vi.restoreAllMocks());

    it('loga o erro com um código de suporte e mostra o mesmo código ao usuário', () => {
        handler.handleError(new TypeError('x is undefined'));

        const [, , , context, cause] = consoleError.mock.calls[0];
        const code = (context as { supportCode: string }).supportCode;

        expect(code).toMatch(/^[0-9a-f]{8}$/);
        expect(cause).toBeInstanceOf(TypeError);
        expect(messages.add).toHaveBeenCalledTimes(1);
        expect(messages.add.mock.calls[0][0].detail).toContain(code);
    });

    it('não repete o aviso quando o mesmo erro se repete em sequência', () => {
        handler.handleError(new Error('igual'));
        handler.handleError(new Error('igual'));

        expect(consoleError).toHaveBeenCalledTimes(2);
        expect(messages.add).toHaveBeenCalledTimes(1);
    });

    it('erro da API não tratado mostra a mensagem do back', () => {
        handler.handleError({ rejection: new ApiError(409, 'CONFLICT', 'Já existe', 'req-123') });

        expect(consoleError.mock.calls[0][3]).toMatchObject({ code: 'CONFLICT', requestId: 'req-123' });
        expect(messages.add.mock.calls[0][0].detail).toContain('Já existe');
    });
});
