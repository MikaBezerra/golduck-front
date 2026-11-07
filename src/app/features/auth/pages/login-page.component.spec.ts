import type { Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { FormGroup } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { apiError, internals } from '../../../../testing/components';
import { LoginPageComponent } from './login-page.component';

interface Internals {
    readonly form: FormGroup;
    readonly errorMessage: Signal<string | null>;
    readonly submitting: Signal<boolean>;
    submit(): void;
}

describe('LoginPageComponent', () => {
    const auth = { login: vi.fn() };
    let navigateByUrl: ReturnType<typeof vi.spyOn>;

    function render(redirect?: string) {
        auth.login.mockReset();
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [LoginPageComponent],
            providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
        });
        navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

        const fixture = TestBed.createComponent(LoginPageComponent);

        if (redirect !== undefined) {
            fixture.componentRef.setInput('redirect', redirect);
        }

        fixture.detectChanges();

        return internals<Internals>(fixture);
    }

    function fillAndSubmit(page: Internals, email = ' Ana@Exemplo.com', password = 'senha-123'): void {
        page.form.setValue({ email: email.trim(), password });
        page.submit();
    }

    it('não tenta entrar com o formulário incompleto', () => {
        const page = render();

        page.submit();

        expect(auth.login).not.toHaveBeenCalled();
        expect(page.form.get('email')?.touched).toBe(true);
    });

    it('envia o e-mail em minúsculas e volta para a página pedida', () => {
        const page = render('/despesas?mes=2026-11');
        auth.login.mockReturnValue(of(undefined));

        fillAndSubmit(page);

        expect(auth.login).toHaveBeenCalledWith({ email: 'ana@exemplo.com', password: 'senha-123' });
        expect(navigateByUrl).toHaveBeenCalledWith('/despesas?mes=2026-11');
    });

    it('ignora redirecionamentos para fora do app ou de volta ao login', () => {
        for (const redirect of ['https://site-malicioso.com', '//site-malicioso.com', '/login', '']) {
            const page = render(redirect);
            auth.login.mockReturnValue(of(undefined));

            fillAndSubmit(page);

            expect(navigateByUrl, redirect).toHaveBeenCalledWith('/');
        }
    });

    it('mostra "E-mail ou senha incorretos." para credenciais inválidas', () => {
        const page = render();
        auth.login.mockReturnValue(apiError(401, 'AUTH_INVALID_CREDENTIALS', 'Credenciais inválidas'));

        fillAndSubmit(page);

        expect(page.errorMessage()).toBe('E-mail ou senha incorretos.');
        expect(page.submitting()).toBe(false);
        expect(navigateByUrl).not.toHaveBeenCalled();
    });

    it('mostra a mensagem do back para outros erros (ex.: muitas tentativas)', () => {
        const page = render();
        auth.login.mockReturnValue(apiError(429, 'TOO_MANY_REQUESTS', 'Muitas tentativas. Aguarde um pouco.'));

        fillAndSubmit(page);

        expect(page.errorMessage()).toContain('Muitas tentativas');
    });

    it('erros de validação do back vão para o campo', () => {
        const page = render();
        auth.login.mockReturnValue(
            apiError(400, 'VALIDATION_ERROR', 'Inválido', [
                { field: 'email', code: 'string.email', message: 'email deve conter um e-mail válido' },
            ]),
        );

        fillAndSubmit(page);

        expect(page.form.get('email')?.getError('server')).toBe('email deve conter um e-mail válido');
        expect(page.errorMessage()).toBeNull();
    });
});
