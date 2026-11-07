import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { ApiError, parseRetryAfter } from './api-error';

describe('ApiError', () => {
    it('lê o Retry-After em segundos ou como data HTTP', () => {
        const now = Date.parse('2026-11-07T12:00:00Z');

        expect(parseRetryAfter('60', now)).toBe(60);
        expect(parseRetryAfter('Sat, 07 Nov 2026 12:01:30 GMT', now)).toBe(90);
        expect(parseRetryAfter('Sat, 07 Nov 2026 11:00:00 GMT', now)).toBe(0);
        expect(parseRetryAfter('amanhã', now)).toBeNull();
        expect(parseRetryAfter(null, now)).toBeNull();
    });

    it('429 vira mensagem amigável com o tempo de espera e mantém o id do back', () => {
        const error = ApiError.from(
            new HttpErrorResponse({
                status: 429,
                headers: new HttpHeaders({ 'Retry-After': '120' }),
                error: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests', requestId: 'abcdef123' } },
            }),
        );

        expect(error).toMatchObject({ code: 'TOO_MANY_REQUESTS', retryAfterSeconds: 120, requestId: 'abcdef123' });
        expect(error.message).toBe('Muitas tentativas seguidas. Tente de novo em 2 minutos.');
        expect(ApiError.tooManyRequests(1).message).toContain('1 segundo');
        expect(ApiError.tooManyRequests(null).message).toContain('Aguarde um pouco');
    });

    it('sem código de suporte, a mensagem da tela é só a do back', () => {
        const error = new ApiError(409, 'CONFLICT', 'Já existe');

        expect(error.supportCode).toBeNull();
        expect(error.userMessage).toBe('Já existe');
    });
});
