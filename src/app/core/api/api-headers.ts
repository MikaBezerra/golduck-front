/** Headers HTTP combinados com o back (o CORS do back expõe os de resposta). */

/** Id da requisição: o front envia, o back reaproveita no log e devolve na resposta. */
export const REQUEST_ID_HEADER = 'x-request-id';

/** Segundos (ou data) até poder tentar de novo, nas respostas 429. */
export const RETRY_AFTER_HEADER = 'retry-after';
