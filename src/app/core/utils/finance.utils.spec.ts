import { Category, EMPTY_FILTERS, Transaction } from '../models/finance.models';
import {
  budgetProgress,
  calculateTotals,
  filterTransactions,
  monthlyTotals,
  spendingByCategory,
} from './finance.utils';

const categories: Category[] = [
  { id: 'salary', name: 'Salary', type: 'income', color: '#10b981', budget: null },
  { id: 'food', name: 'Groceries', type: 'expense', color: '#22c55e', budget: 300 },
  { id: 'fun', name: 'Entertainment', type: 'expense', color: '#ec4899', budget: 100 },
  { id: 'misc', name: 'Misc', type: 'expense', color: '#64748b', budget: null },
];

const tx = (
  id: string,
  date: string,
  type: Transaction['type'],
  categoryId: string,
  amount: number,
  description = '',
): Transaction => ({ id, date, type, categoryId, amount, description });

const transactions: Transaction[] = [
  tx('1', '2026-10-01', 'income', 'salary', 3000, 'October salary'),
  tx('2', '2026-10-03', 'expense', 'food', 120.1, 'Costco'),
  tx('3', '2026-10-15', 'expense', 'food', 150.2, 'Whole Foods'),
  tx('4', '2026-10-20', 'expense', 'fun', 130, 'Concert tickets'),
  tx('5', '2026-11-01', 'income', 'salary', 3000, 'November salary'),
  tx('6', '2026-11-02', 'expense', 'misc', 40, 'Haircut'),
];

describe('finance utils', () => {
  it('calculates totals without floating point noise', () => {
    expect(calculateTotals(transactions)).toEqual({
      income: 6000,
      expenses: 440.3,
      balance: 5559.7,
    });
  });

  it('groups spending by category, largest first', () => {
    const result = spendingByCategory(transactions.slice(0, 4), categories);
    expect(result.map((r) => [r.category.id, r.amount])).toEqual([
      ['food', 270.3],
      ['fun', 130],
    ]);
  });

  it('returns totals for every requested month, including empty ones', () => {
    const result = monthlyTotals(transactions, ['2026-09', '2026-10', '2026-11']);
    expect(result).toEqual([
      { month: '2026-09', income: 0, expenses: 0 },
      { month: '2026-10', income: 3000, expenses: 400.3 },
      { month: '2026-11', income: 3000, expenses: 40 },
    ]);
  });

  it('flags budgets that are close to or over the limit', () => {
    const progress = budgetProgress(transactions.slice(0, 4), categories);
    const byId = Object.fromEntries(progress.map((p) => [p.category.id, p]));

    expect(progress.length).toBe(3);
    expect(byId['food'].status).toBe('warning');
    expect(byId['food'].remaining).toBe(29.7);
    expect(byId['fun'].status).toBe('over');
    expect(byId['fun'].percent).toBe(130);
    expect(byId['misc'].status).toBe('none');
  });

  describe('filterTransactions', () => {
    const map = new Map(categories.map((c) => [c.id, c]));

    it('returns everything with empty filters', () => {
      expect(filterTransactions(transactions, EMPTY_FILTERS, map).length).toBe(6);
    });

    it('filters by type, category and date range', () => {
      const result = filterTransactions(
        transactions,
        {
          ...EMPTY_FILTERS,
          type: 'expense',
          categoryId: 'food',
          from: '2026-10-10',
          to: '2026-10-31',
        },
        map,
      );
      expect(result.map((t) => t.id)).toEqual(['3']);
    });

    it('searches descriptions and category names case-insensitively', () => {
      expect(
        filterTransactions(transactions, { ...EMPTY_FILTERS, search: 'COSTCO' }, map).map(
          (t) => t.id,
        ),
      ).toEqual(['2']);
      expect(
        filterTransactions(transactions, { ...EMPTY_FILTERS, search: 'entertain' }, map).map(
          (t) => t.id,
        ),
      ).toEqual(['4']);
    });
  });
});
