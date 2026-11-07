import type { ApiSchemas } from '../../../core/api/api-types';

/** Banco emissor: define o formato da fatura (NUBANK e C6 em CSV, NEON em PDF). */
export type CardBank = ApiSchemas['CardBank'];

/** Cartão de crédito. O banco é definido na criação e não muda depois. */
export type CreditCard = ApiSchemas['CreditCardResponse'];

export type CreateCreditCardRequest = ApiSchemas['CreateCreditCardDto'];

/** O back não permite trocar o banco: só nome e situação. */
export type UpdateCreditCardRequest = ApiSchemas['UpdateCreditCardDto'];

export const CARD_BANK_LABELS: Readonly<Record<CardBank, string>> = {
    NUBANK: 'Nubank',
    C6: 'C6 Bank',
    NEON: 'Neon',
};

export const CARD_BANK_OPTIONS = (Object.keys(CARD_BANK_LABELS) as CardBank[]).map((bank) => ({
    label: CARD_BANK_LABELS[bank],
    value: bank,
}));

/** Limite do back (VARCHAR 120). */
export const CREDIT_CARD_NAME_MAX_LENGTH = 120;
