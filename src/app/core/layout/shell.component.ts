import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    type OnInit,
    signal,
    untracked,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { Tooltip } from 'primeng/tooltip';

import { AppFooterComponent } from '../../shared/ui/app-footer.component';
import { AuthService } from '../auth/auth.service';
import { BottomNavComponent } from './bottom-nav.component';
import { BrandLogoComponent } from './brand-logo.component';
import { MonthPickerComponent } from './month-picker.component';
import { SidebarStateService } from './sidebar-state.service';
import { SidebarNavComponent } from './sidebar-nav.component';
import { UserBadgeComponent } from './user-badge.component';

/**
 * Moldura das telas logadas: menu lateral (telas grandes, pode ser recolhido) ou barra no pé da tela (celular),
 * barra do topo com o mês e a área onde cada página é desenhada (`<router-outlet />`).
 */
@Component({
    selector: 'app-shell',
    imports: [
        RouterOutlet,
        Button,
        Drawer,
        Tooltip,
        BottomNavComponent,
        BrandLogoComponent,
        MonthPickerComponent,
        SidebarNavComponent,
        UserBadgeComponent,
        AppFooterComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './shell.component.html',
})
export class ShellComponent implements OnInit {
    private readonly auth = inject(AuthService);
    protected readonly sidebar = inject(SidebarStateService);

    protected readonly collapsed = this.sidebar.collapsed;
    protected readonly sidebarClass = computed(
        () =>
            'sticky top-0 hidden h-dvh shrink-0 p-4 pr-0 transition-[width] duration-300 ease-out ' +
            'motion-reduce:transition-none lg:block ' +
            (this.collapsed() ? 'w-24' : 'w-72'),
    );

    /** Folha "Mais" do celular (cadastros e conta). */
    protected readonly moreOpen = signal(false);

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
        this.moreOpen.set(false);
        this.auth.logout();
    }
}
