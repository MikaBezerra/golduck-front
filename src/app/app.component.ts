import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, Toast, ConfirmDialog],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <!-- Fundo com as cores da marca, atrás de todas as telas. -->
        <div class="app-backdrop" aria-hidden="true"></div>
        <p-toast
            position="top-right"
            [breakpoints]="{ '640px': { width: 'calc(100vw - 2rem)', right: '1rem', left: '1rem' } }"
        />
        <p-confirmdialog />
        <router-outlet />
    `,
})
export class AppComponent {}
