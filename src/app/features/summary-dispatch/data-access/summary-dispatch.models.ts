import type { ApiSchemas } from '../../../core/api/api-types';

/**
 * Prévia do envio do mês (`GET /summary/dispatches/preview?month=`): quem vai receber (e-mail
 * mascarado, `an•••@gmail.com`), se o envio está ligado neste ambiente (`enabled`) e o último envio
 * do mês (`lastDispatch`, null se nunca foi enviado).
 */
export type SummaryDispatchPreview = ApiSchemas['SummaryDispatchPreviewResponse'];

/** Uma pessoa da prévia: `hasEmail` false = não vai receber (sem e-mail cadastrado). */
export type SummaryDispatchRecipient = ApiSchemas['SummaryDispatchRecipientDto'];

/**
 * Resultado de um envio (`POST /summary/dispatches`). Vem 200 mesmo com falhas parciais: cada pessoa
 * é um item com `status` e, quando não foi enviado, a `message` pronta para a tela.
 */
export type SummaryDispatch = ApiSchemas['SummaryDispatchResponse'];

export type SummaryDispatchItem = ApiSchemas['SummaryDispatchItemDto'];

export type SummaryDispatchItemStatus = SummaryDispatchItem['status'];

/** O e-mail de uma pessoa como ela vai receber (`GET /summary/dispatches/email`), sem enviar. */
export type SummaryEmailPreview = ApiSchemas['SummaryEmailPreviewResponse'];

/** Rótulo, ícone e cor de cada situação do item, para o painel do resultado. */
export const DISPATCH_ITEM_STATUS: Readonly<
    Record<SummaryDispatchItemStatus, { readonly label: string; readonly icon: string; readonly tone: string }>
> = {
    SENT: { label: 'Enviado', icon: 'pi pi-check-circle', tone: 'text-primary-300' },
    SKIPPED_NO_EMAIL: { label: 'Sem e-mail', icon: 'pi pi-exclamation-triangle', tone: 'text-cantaloupe' },
    FAILED: { label: 'Falhou', icon: 'pi pi-times-circle', tone: 'text-negative' },
};

/** Header que o back usa para não enviar duas vezes o mesmo pedido (duplo clique, nova tentativa). */
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';
