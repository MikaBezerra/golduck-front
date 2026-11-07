import { inject, Injectable } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

export interface DangerConfirmOptions {
    readonly header: string;
    readonly message: string;
    /** Texto do botão que confirma, ex.: "Excluir". */
    readonly acceptLabel: string;
}

/**
 * Pergunta de confirmação antes de ações destrutivas.
 * Uso: `if (await this.confirm.danger({ ... })) { ...excluir... }`
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
    private readonly confirmation = inject(ConfirmationService);

    public async danger(options: DangerConfirmOptions): Promise<boolean> {
        return new Promise((resolve) => {
            this.confirmation.confirm({
                header: options.header,
                message: options.message,
                icon: 'pi pi-exclamation-triangle',
                acceptLabel: options.acceptLabel,
                rejectLabel: 'Cancelar',
                acceptButtonProps: { severity: 'danger' },
                rejectButtonProps: { severity: 'secondary', outlined: true },
                defaultFocus: 'reject',
                accept: () => resolve(true),
                reject: () => resolve(false),
            });
        });
    }
}
