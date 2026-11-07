import { ChangeDetectionStrategy, Component, effect, inject, type OnInit, signal, untracked } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';

import { AuthService } from '../auth/auth.service';
import { MonthPickerComponent } from './month-picker.component';
import { SidebarNavComponent } from './sidebar-nav.component';
import { UserBadgeComponent } from './user-badge.component';

/**
 * Moldura das telas logadas: menu lateral, barra do topo e a área onde
 * cada página é desenhada (`<router-outlet />`).
 */
@Component({
    selector: 'app-shell',
    imports: [RouterOutlet, RouterLink, Button, Drawer, MonthPickerComponent, SidebarNavComponent, UserBadgeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './shell.component.html',
})
export class ShellComponent implements OnInit {
    private readonly auth = inject(AuthService);

    protected readonly menuOpen = signal(false);

    public constructor() {
        // Sessão encerrada em outra aba: sai desta também.
        effect(() => {
            if (!this.auth.isAuthenticated()) {
                untracked(() => this.auth.redirectToLogin());
            }
        });
    }

    public ngOnInit(): void {
        // Depois de um F5 a sessão continua, mas os dados do usuário precisam ser buscados de novo.
        if (!this.auth.user()) {
            this.auth.loadUser();
        }
    }

    protected logout(): void {
        this.menuOpen.set(false);
        this.auth.logout();
    }
}
