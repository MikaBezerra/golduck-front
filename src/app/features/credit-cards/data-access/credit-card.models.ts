/** Espelha financas/src/modules/credit-cards/dto/credit-card.dto.ts e o enum CardBank do Prisma. */

export type CardBank = 'NUBANK' | 'C6' | 'NEON';

export interface CreditCard {
    readonly id: string;
    readonly name: string;
    /** Banco emissor. Definido na criação e não muda depois. */
    readonly bank: CardBank;
    readonly active: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface CreateCreditCardRequest {
    readonly name: string;
    readonly bank: CardBank;
}

/** O back não permite trocar o banco: só nome e situação. */
export interface UpdateCreditCardRequest {
    readonly name?: string;
    readonly active?: boolean;
}

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
