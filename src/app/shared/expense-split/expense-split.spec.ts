import {
    PENDING_LABEL,
    SHARED_CHOICE,
    SHARED_LABEL,
    choiceOf,
    personChoiceOptions,
    splitLabel,
    splitOfChoice,
} from './expense-split';

describe('expense-split', () => {
    const names = new Map([['ana-id', 'Ana']]);
    const nameOf = (id: string): string | undefined => names.get(id);

    it('choiceOf: pessoa, compartilhada ou null quando pendente', () => {
        expect(choiceOf({ split: 'PERSONAL', personId: 'ana-id' })).toBe('ana-id');
        expect(choiceOf({ split: 'SHARED', personId: null })).toBe(SHARED_CHOICE);
        expect(choiceOf({ split: 'PENDING', personId: null })).toBeNull();
    });

    it('splitOfChoice: o corpo que vai ao back', () => {
        expect(splitOfChoice(SHARED_CHOICE)).toEqual({ split: 'SHARED' });
        expect(splitOfChoice('ana-id')).toEqual({ split: 'PERSONAL', personId: 'ana-id' });
    });

    it('personChoiceOptions: "Compartilhada" vem antes das pessoas', () => {
        expect(personChoiceOptions([{ label: 'Ana', value: 'ana-id' }])).toEqual([
            { label: SHARED_LABEL, value: SHARED_CHOICE },
            { label: 'Ana', value: 'ana-id' },
        ]);
    });

    it('splitLabel: nome, "Compartilhada" ou "Sem pessoa"', () => {
        expect(splitLabel({ split: 'PERSONAL', personId: 'ana-id' }, nameOf)).toBe('Ana');
        expect(splitLabel({ split: 'PERSONAL', personId: 'outra' }, nameOf)).toBe('…');
        expect(splitLabel({ split: 'SHARED', personId: null }, nameOf)).toBe(SHARED_LABEL);
        expect(splitLabel({ split: 'PENDING', personId: null }, nameOf)).toBe(PENDING_LABEL);
    });
});
