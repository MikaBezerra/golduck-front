import { inject, Injectable } from '@angular/core';
import { forkJoin, map, type Observable, of, switchMap } from 'rxjs';

import { parseMonthKey } from '../../../shared/month/month';
import { CardExpenseService } from '../../card-expenses/data-access/card-expense.service';
import type { CreditCard } from '../../credit-cards/data-access/credit-card.models';
import { CreditCardService } from '../../credit-cards/data-access/credit-card.service';
import { IncomeService } from '../../incomes/data-access/income.service';
import { ManualExpenseService } from '../../manual-expenses/data-access/manual-expense.service';
import { PersonService } from '../../people/data-access/person.service';
import { ReserveService } from '../../reserves/data-access/reserve.service';
import type { StatementSource } from './summary-statement';

/**
 * Junta o que a tabela do resumo precisa, tudo em paralelo (`forkJoin`, como um `Promise.all`):
 * entrada e reserva do ano, pessoas, despesas fora do cartão e do cartão do mês, e os cartões.
 * A lista de cartões só traz os ativos; um cartão inativo com compras no mês é buscado pelo id.
 */
@Injectable({ providedIn: 'root' })
export class SummaryStatementService {
    private readonly incomes = inject(IncomeService);
    private readonly reserves = inject(ReserveService);
    private readonly people = inject(PersonService);
    private readonly manualExpenses = inject(ManualExpenseService);
    private readonly cardExpenses = inject(CardExpenseService);
    private readonly creditCards = inject(CreditCardService);

    public load(month: string): Observable<StatementSource> {
        const { year } = parseMonthKey(month);

        return forkJoin({
            incomes: this.incomes.findByYear(year),
            reserves: this.reserves.findByYear(year),
            people: this.people.findAll(true),
            manualExpenses: this.manualExpenses.findByMonth(month),
            cardExpenses: this.cardExpenses.findByMonthAllCards(month),
            cards: this.creditCards.findAll(),
        }).pipe(
            switchMap((data) => {
                const known = new Set(data.cards.map((card) => card.id));
                const missing = [...new Set(data.cardExpenses.map((expense) => expense.cardId))].filter(
                    (id) => !known.has(id),
                );
                const extraCards: Observable<CreditCard[]> =
                    missing.length === 0 ? of([]) : forkJoin(missing.map((id) => this.creditCards.findById(id)));

                return extraCards.pipe(
                    map((extra): StatementSource => ({
                        month,
                        income: data.incomes.find((income) => income.month === month)?.amount ?? null,
                        reserve: data.reserves.items.find((reserve) => reserve.month === month)?.amount ?? null,
                        reserveAvailable: data.reserves.available,
                        people: data.people,
                        manualExpenses: data.manualExpenses,
                        cardExpenses: data.cardExpenses,
                        cards: [...data.cards, ...extra],
                    })),
                );
            }),
        );
    }
}
