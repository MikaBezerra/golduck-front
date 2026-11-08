import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import type {
    CardImport,
    CardImportExclusion,
    CardImportOverride,
    CardImportPreview,
    CardImportResult,
} from './card-import.models';

export interface UploadStatementRequest {
    readonly cardId: string;
    readonly month: string;
    readonly file: File;
    /** Senha do PDF protegido (Neon). Usada só para abrir o arquivo; o back não grava. */
    readonly password?: string;
}

export interface SaveStatementRequest extends UploadStatementRequest {
    /** Escolhas feitas na pré-visualização. Compras sem escolha ficam com a sugestão do back. */
    readonly overrides?: readonly CardImportOverride[];
    /** Excluir, manter excluída ou restaurar compras do arquivo. */
    readonly exclusions?: readonly CardImportExclusion[];
}

/** Chamadas HTTP de `/card-imports` (ver `card-imports/controller` no back). */
@Injectable({ providedIn: 'root' })
export class CardImportService {
    private readonly api = inject(ApiService);

    /** Lê o arquivo e devolve o que o envio faria, sem gravar nada. */
    public preview(request: UploadStatementRequest): Observable<CardImportPreview> {
        return this.api.post<CardImportPreview>('card-imports/preview', toFormData(request));
    }

    /**
     * Grava a fatura de verdade. O arquivo é enviado de novo (o back lê de novo e não guarda
     * nada entre a pré-visualização e o salvamento), junto com as escolhas do usuário.
     */
    public save(request: SaveStatementRequest): Observable<CardImportResult> {
        const form = toFormData(request);

        if (request.overrides && request.overrides.length > 0) {
            form.append('overrides', JSON.stringify(request.overrides));
        }

        if (request.exclusions && request.exclusions.length > 0) {
            form.append('exclusions', JSON.stringify(request.exclusions));
        }

        return this.api.post<CardImportResult>('card-imports', form);
    }

    /** Envios do cartão, do mais recente para o mais antigo. */
    public findAll(filter: { cardId?: string; month?: string } = {}): Observable<CardImport[]> {
        return this.api.get<CardImport[]>('card-imports', filter);
    }

    /** Apaga o envio e as despesas gravadas por ele. Não restaura a situação anterior. */
    public delete(id: string): Observable<void> {
        return this.api.delete(`card-imports/${id}`);
    }
}

/**
 * Monta o `multipart/form-data`. O `HttpClient` gera o cabeçalho com o separador
 * sozinho quando o corpo é um `FormData`.
 */
function toFormData(request: UploadStatementRequest): FormData {
    const form = new FormData();

    form.append('cardId', request.cardId);
    form.append('month', request.month);
    form.append('file', request.file, request.file.name);

    if (request.password) {
        form.append('password', request.password);
    }

    return form;
}
