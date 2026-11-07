import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';

import { AuthService } from '../auth/auth.service';
import { MonthPickerComponent } from './month-picker.component';
import { SidebarNavComponent } from './sidebar-nav.component';

/**
 * Moldura das telas logadas: menu lateral, barra do topo e a área onde
 * cada página é desenhada (`<router-outlet />`).
 */
@Component({
    selector: 'app-shell',
    imports: [RouterOutlet, RouterLink, Button, Drawer, MonthPickerComponent, SidebarNavComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './shell.component.html',
})
export class ShellComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    protected readonly menuOpen = signal(false);

    public constructor() {
        // Sessão encerrada em outra aba: sai desta também.
        effect(() => {
            if (!this.auth.isAuthenticated()) {
                void this.router.navigate(['/login']);
            }
        });
    }

    protected logout(): void {
        this.menuOpen.set(false);
        this.auth.logout();
    }
}
