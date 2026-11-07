import type { ApiSchemas } from '../../../core/api/api-types';
import type { CardBank } from '../../credit-cards/data-access/credit-card.models';

/**
 * Um envio de fatura (arquivo ou lançamento manual). `expenseCount` são as despesas cuja
 * última gravação veio deste envio: são as que a exclusão remove.
 */
export type CardImport = ApiSchemas['CardImportResponse'];

/** O que o envio fez: compras novas, atualizadas, removidas, parcelas futuras e linhas ignoradas. */
export type CardImportSummary = ApiSchemas['CardImportSummary'];

export type CardImportResult = ApiSchemas['CardImportResultResponse'];

/** Um lançamento da fatura digitada à mão (`installment: null` para compra à vista). */
export type ManualCardTransaction = ApiSchemas['ManualCardTransactionDto'];

export type CreateManualCardImportRequest = ApiSchemas['CreateManualCardImportDto'];

/** Arquivo aceito por banco (o back confere a extensão). */
export const STATEMENT_FILE_EXTENSION: Readonly<Record<CardBank, string>> = {
    NUBANK: '.csv',
    C6: '.csv',
    NEON: '.pdf',
};

/** Bancos cuja fatura costuma vir em PDF protegido por senha. */
export const BANKS_WITH_PDF_PASSWORD: ReadonlySet<CardBank> = new Set<CardBank>(['NEON']);

/** Limite do back para a senha do PDF. */
export const STATEMENT_PASSWORD_MAX_LENGTH = 100;

/** Limite do back para o arquivo da fatura. */
export const MAX_STATEMENT_FILE_BYTES = 2 * 1024 * 1024;

/** Limites do back para a fatura manual. */
export const MAX_MANUAL_TRANSACTIONS = 500;
export const MAX_INSTALLMENTS = 99;
export const MANUAL_DESCRIPTION_MAX_LENGTH = 200;

/** Resumo do envio em frases curtas, para mostrar ao usuário. */
export function describeImportSummary(summary: CardImportSummary): string[] {
    const lines: string[] = [];
    const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

    lines.push(plural(summary.created, 'compra nova', 'compras novas'));
    lines.push(plural(summary.updated, 'compra atualizada', 'compras atualizadas'));

    if (summary.removed > 0) {
        lines.push(plural(summary.removed, 'despesa removida', 'despesas removidas') + ' (não estavam na fatura)');
    }

    if (summary.projected > 0) {
        lines.push(
            plural(summary.projected, 'parcela futura lançada', 'parcelas futuras lançadas') + ' nos próximos meses',
        );
    }

    if (summary.ignored > 0) {
        lines.push(
            plural(summary.ignored, 'linha ignorada', 'linhas ignoradas') + ' (pagamentos, estornos e créditos)',
        );
    }

    return lines;
}
