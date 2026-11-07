import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { VersionService } from '../../core/version/version.service';

/**
 * Rodapé de todas as telas (inclusive o login): direitos autorais e, discretas, as versões do
 * front e da API (com commit e ambiente na dica), para facilitar o suporte.
 */
@Component({
    selector: 'app-footer',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block' },
    template: `
        <footer class="flex flex-col items-center gap-1.5 px-4 py-6 text-center text-xs text-muted-color">
            <p class="m-0 flex items-center gap-2">
                <span class="h-1 w-1 rounded-full bg-cantaloupe/80" aria-hidden="true"></span>
                <span>© 2026 <span class="font-medium text-color">M4r4c4tu</span>. All rights reserved.</span>
                <span class="h-1 w-1 rounded-full bg-cantaloupe/80" aria-hidden="true"></span>
            </p>
            <p class="m-0 text-[11px] tabular-nums" [title]="details()">
                v{{ versions.appVersion }}
                @if (versions.apiVersion(); as api) {
                    · API v{{ api.version }}
                    @if (api.environment !== 'production') {
                        ({{ api.environment }})
                    }
                }
            </p>
        </footer>
    `,
})
export class AppFooterComponent {
    protected readonly versions = inject(VersionService);

    protected readonly details = computed(() => {
        const api = this.versions.apiVersion();
        const front = `Front v${this.versions.appVersion}`;

        if (!api) {
            return front;
        }

        const commit = api.commit ? ` · commit ${api.commit.slice(0, 7)}` : '';

        return `${front} · API ${api.name} v${api.version}${commit} · ${api.environment}`;
    });

    public constructor() {
        this.versions.load();
    }
}
