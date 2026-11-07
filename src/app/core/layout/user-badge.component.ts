import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AuthService } from '../auth/auth.service';

const ROLE_LABELS = { ADMIN: 'Administrador', USER: 'Usuário' } as const;

/** Quem está logado: inicial, e-mail e perfil. Fica vazio até o `GET /auth/me` responder. */
@Component({
    selector: 'app-user-badge',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (user(); as current) {
            <div class="flex min-w-0 items-center gap-3 px-3 py-2">
                <span
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 font-semibold text-primary-700 uppercase"
                    aria-hidden="true"
                >
                    {{ initial() }}
                </span>
                <span class="flex min-w-0 flex-col">
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
    protected readonly user = inject(AuthService).user;
    protected readonly initial = computed(() => this.user()?.email.charAt(0) ?? '');
    protected readonly roleLabel = computed(() => {
        const user = this.user();

        return user ? ROLE_LABELS[user.role] : '';
    });
}
