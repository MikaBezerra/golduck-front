import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { AuthService } from '../auth/auth.service';

const ROLE_LABELS = { ADMIN: 'Administrador', USER: 'Usuário' } as const;

/**
 * Quem está logado: inicial, e-mail e perfil. Fica vazio até o `GET /auth/me` responder.
 * `compact` mostra só a inicial (menu lateral recolhido); o e-mail fica no balão e para leitores de tela.
 */
@Component({
    selector: 'app-user-badge',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (user(); as current) {
            <div [class]="compact() ? 'flex justify-center py-2' : 'flex min-w-0 items-center gap-3 px-3 py-2'">
                <span
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-135 from-cantaloupe to-primary-500 font-display font-bold text-midnight uppercase"
                    [title]="compact() ? current.email : ''"
                    aria-hidden="true"
                >
                    {{ initial() }}
                </span>
                <span [class]="compact() ? 'sr-only' : 'flex min-w-0 flex-col'">
                    <span class="truncate text-sm font-medium text-color" [title]="current.email">{{
                        current.email
                    }}</span>
                    <span class="text-xs text-muted-color">{{ roleLabel() }}</span>
                </span>
            </div>
        }
    `,
})
export class UserBadgeComponent {
    public readonly compact = input(false);

    protected readonly user = inject(AuthService).user;
    protected readonly initial = computed(() => this.user()?.email.charAt(0) ?? '');
    protected readonly roleLabel = computed(() => {
        const user = this.user();

        return user ? ROLE_LABELS[user.role] : '';
    });
}
