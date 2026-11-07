import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';

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
    protected readonly menuOpen = signal(false);
}
