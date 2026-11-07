import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Rodapé com os direitos autorais, no pé de todas as telas (inclusive o login). */
@Component({
    selector: 'app-footer',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block' },
    template: `
        <footer class="flex items-center justify-center gap-2 px-4 py-6 text-center text-xs text-muted-color">
            <span class="h-1 w-1 rounded-full bg-cantaloupe/80" aria-hidden="true"></span>
            <span>© 2026 <span class="font-medium text-color">M4r4c4tu</span>. All rights reserved.</span>
            <span class="h-1 w-1 rounded-full bg-cantaloupe/80" aria-hidden="true"></span>
        </footer>
    `,
})
export class AppFooterComponent {}
