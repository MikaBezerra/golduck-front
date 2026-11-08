import type { ApiSchemas } from '../../../core/api/api-types';
import type { CardBank } from '../../credit-cards/data-access/credit-card.models';

/**
 * Um envio de fatura por arquivo (o plano B da sincronização). `expenseCount` são as despesas cuja
 * última gravação veio deste envio: são as que a exclusão remove.
 */
export type CardImport = ApiSchemas['CardImportResponse'];

/** O que o envio fez: compras novas, atualizadas, removidas, parcelas futuras e linhas ignoradas. */
export type CardImportSummary = ApiSchemas['CardImportSummary'];

export type CardImportResult = ApiSchemas['CardImportResultResponse'];

/**
 * Resposta de `POST /card-imports/preview`: o que o envio faria, sem gravar nada.
 * - `transactions`: compras do arquivo, com a sugestão de apelido, categoria e pessoa;
 * - `removed`: despesas do mês que seriam apagadas por não estarem no arquivo;
 * - `summary`: igual ao que o salvamento devolveria agora.
 */
export type CardImportPreview = ApiSchemas['CardImportPreviewResponse'];

/** Uma compra da pré-visualização. `status`: `"new"` (ainda não existe no mês) ou `"update"`. */
export type CardImportPreviewTransaction = ApiSchemas['CardImportPreviewTransactionDto'];

/**
 * Decisão sobre uma compra do arquivo, enviada ao salvar: `exclude` (excluir ou manter
 * excluída; `remember` = não perguntar de novo) ou `restore`.
 */
export type CardImportExclusion = ApiSchemas['CardImportExclusionDto'];

/** Escolha do usuário para uma compra (`key` da pré-visualização), enviada ao salvar. */
export type CardImportOverride = ApiSchemas['CardImportOverrideDto'];

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

/**
 * Resumo do envio em frases curtas, para mostrar ao usuário.
 * `when: 'preview'` descreve o que VAI acontecer ao salvar; `'done'`, o que já aconteceu.
 */
export function describeImportSummary(summary: CardImportSummary, when: 'done' | 'preview' = 'done'): string[] {
    const lines: string[] = [];
    const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;
    const future = when === 'preview';

    lines.push(plural(summary.created, 'compra nova', 'compras novas'));
    lines.push(
        future
            ? plural(summary.updated, 'compra já lançada será atualizada', 'compras já lançadas serão atualizadas')
            : plural(summary.updated, 'compra atualizada', 'compras atualizadas'),
    );

    if (summary.removed > 0) {
        lines.push(
            future
                ? plural(summary.removed, 'despesa será removida', 'despesas serão removidas') +
                      ' (não estão no arquivo)'
                : plural(summary.removed, 'despesa removida', 'despesas removidas') + ' (não estavam na fatura)',
        );
    }

    if (summary.projected > 0) {
        lines.push(
            future
                ? plural(summary.projected, 'parcela futura será lançada', 'parcelas futuras serão lançadas') +
                      ' nos próximos meses'
                : plural(summary.projected, 'parcela futura lançada', 'parcelas futuras lançadas') +
                      ' nos próximos meses',
        );
    }

    if (summary.ignored > 0) {
        lines.push(
            plural(summary.ignored, 'linha ignorada', 'linhas ignoradas') + ' (pagamentos, estornos e créditos)',
        );
    }

    return lines;
}
