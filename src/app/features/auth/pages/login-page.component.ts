import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Password } from 'primeng/password';

import { ApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { applyServerErrors, revealFormErrors } from '../../../shared/forms/form-errors';
import { AppFooterComponent } from '../../../shared/ui/app-footer.component';
import { BrandMarkComponent } from '../../../shared/ui/brand-mark.component';
import { BrandNameComponent } from '../../../shared/ui/brand-name.component';

@Component({
    selector: 'app-login-page',
    imports: [
        ReactiveFormsModule,
        Button,
        InputText,
        Message,
        Password,
        FieldErrorComponent,
        BrandMarkComponent,
        BrandNameComponent,
        AppFooterComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './login-page.component.html',
})
export class LoginPageComponent {
    /** Página para onde voltar depois do login (vem de `?redirect=` na URL). */
    public readonly redirect = input<string>();

    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    protected readonly form = inject(NonNullableFormBuilder).group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]],
    });
    protected readonly submitting = signal(false);
    protected readonly errorMessage = signal<string | null>(null);

    protected submit(): void {
        if (this.form.invalid) {
            revealFormErrors(this.form);
            return;
        }

        const { email, password } = this.form.getRawValue();

        this.submitting.set(true);
        this.errorMessage.set(null);

        this.auth.login({ email: email.trim().toLowerCase(), password }).subscribe({
            next: () => void this.router.navigateByUrl(safeRedirect(this.redirect())),
            error: (error: unknown) => {
                this.submitting.set(false);

                const apiError = ApiError.from(error);

                if (apiError.code === 'AUTH_INVALID_CREDENTIALS') {
                    this.errorMessage.set('E-mail ou senha incorretos.');
                } else if (!applyServerErrors(this.form, apiError)) {
                    this.errorMessage.set(apiError.message);
                }
            },
        });
    }
}

/** Só aceita caminhos internos, para um link malicioso não mandar o usuário para outro site. */
function safeRedirect(url: string | undefined): string {
    if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/login')) {
        return '/';
    }

    return url;
}
