import type { ApiSchemas } from '../../../core/api/api-types';

/** Resultado da sincronização de um cartão. `summary` é `null` e `error` vem preenchido quando aquele cartão falhou. */
export type CardSyncResult = ApiSchemas['CardSyncResultResponse'];

/** O que a sincronização fez nas linhas do cartão. */
export type CardSyncSummary = ApiSchemas['CardSyncSummaryResponse'];

export type CardSyncError = ApiSchemas['CardSyncErrorResponse'];

/**
 * Dicas extras para os erros da sincronização: a mensagem do back diz o que houve, a dica diz o que
 * fazer na tela. Os demais códigos (`PLUGGY_UNAVAILABLE`, `PLUGGY_AUTH_FAILED`...) já vêm bem explicados.
 */
const CARD_SYNC_ERROR_HINTS: Readonly<Record<string, string>> = {
    CARD_SYNC_NOT_CONFIGURED: 'Edite o cartão em Cartões e preencha o bloco "Sincronização".',
    CARD_SYNC_NO_CREDIT_ACCOUNT: 'Confira em Cartões se o id do item é o do banco deste cartão.',
    CARD_SYNC_ITEM_NOT_FOUND: 'Copie de novo o id do item no Meu Pluggy e atualize o cartão em Cartões.',
    PLUGGY_DISABLED: 'Use "Enviar fatura" (no menu ⋮) enquanto a sincronização estiver desligada.',
    PLUGGY_UNAVAILABLE: 'Se continuar, use "Enviar fatura" (no menu ⋮) como plano B.',
};

export function cardSyncErrorHint(code: string): string | null {
    return CARD_SYNC_ERROR_HINTS[code] ?? null;
}

/** Resumo em frases curtas: "2 compras novas", "1 alterada"... Só aparece o que aconteceu. */
export function describeSyncSummary(summary: CardSyncSummary): string[] {
    const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;
    const lines: string[] = [];

    if (summary.created > 0) {
        lines.push(plural(summary.created, 'linha criada', 'linhas criadas') + ' (compras novas e parcelas)');
    }

    if (summary.updated > 0) {
        lines.push(plural(summary.updated, 'linha alterada', 'linhas alteradas'));
    }

    if (summary.removed > 0) {
        lines.push(
            plural(summary.removed, 'linha removida', 'linhas removidas') + ' (compra que sumiu ou mudou de fatura)',
        );
    }

    if (summary.replacedManual > 0) {
        lines.push(
            plural(
                summary.replacedManual,
                'compra adicionada à mão foi substituída pela do banco',
                'compras adicionadas à mão foram substituídas pelas do banco',
            ),
        );
    }

    if (lines.length === 0) {
        lines.push('Nada mudou: as faturas já estavam em dia.');
    }

    if (summary.ignored > 0) {
        lines.push(
            plural(summary.ignored, 'lançamento ignorado', 'lançamentos ignorados') + ' (pagamentos e estornos)',
        );
    }

    return lines;
}
