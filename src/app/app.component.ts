import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, Toast, ConfirmDialog],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-toast position="top-right" />
        <p-confirmdialog />
        <router-outlet />
    `,
})
export class AppComponent {}
