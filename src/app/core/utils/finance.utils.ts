import { Category, Transaction, TransactionFilters } from '../models/finance.models';
import { roundMoney } from './format.utils';

export interface Totals {
  income: number;
  expenses: number;
  balance: number;
}

export interface CategoryAmount {
  category: Category;
  amount: number;
}

export interface MonthTotals {
  month: string;
  income: number;
  expenses: number;
}

export type BudgetStatus = 'none' | 'ok' | 'warning' | 'over';

export interface BudgetProgress {
  category: Category;
  spent: number;
  budget: number | null;
  /** Share of the budget used, can go above 100 */
  percent: number;
  remaining: number | null;
  status: BudgetStatus;
}

/** Budgets at or above this percentage are flagged as "close to the limit". */
export const BUDGET_WARNING_PERCENT = 80;

export function calculateTotals(transactions: readonly Transaction[]): Totals {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.type === 'income') {
      income += t.amount;
    } else {
      expenses += t.amount;
    }
  }
  return {
    income: roundMoney(income),
    expenses: roundMoney(expenses),
    balance: roundMoney(income - expenses),
  };
}

export function inMonth(transactions: readonly Transaction[], monthKey: string): Transaction[] {
  return transactions.filter((t) => t.date.startsWith(monthKey));
}

export function sortByDateDesc(transactions: readonly Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => b.date.localeCompare(a.date));
}

export function spendingByCategory(
  transactions: readonly Transaction[],
  categories: readonly Category[],
): CategoryAmount[] {
  const totals = sumExpensesByCategory(transactions);
  return categories
    .filter((c) => totals.has(c.id))
    .map((category) => ({ category, amount: roundMoney(totals.get(category.id) ?? 0) }))
    .sort((a, b) => b.amount - a.amount);
}

export function monthlyTotals(
  transactions: readonly Transaction[],
  months: readonly string[],
): MonthTotals[] {
  return months.map((month) => {
    const totals = calculateTotals(inMonth(transactions, month));
    return { month, income: totals.income, expenses: totals.expenses };
  });
}

export function budgetProgress(
  monthTransactions: readonly Transaction[],
  categories: readonly Category[],
): BudgetProgress[] {
  const totals = sumExpensesByCategory(monthTransactions);

  return categories
    .filter((c) => c.type === 'expense')
    .map((category) => {
      const spent = roundMoney(totals.get(category.id) ?? 0);
      const budget = category.budget && category.budget > 0 ? category.budget : null;
      if (budget === null) {
        return { category, spent, budget, percent: 0, remaining: null, status: 'none' as const };
      }
      const percent = (spent / budget) * 100;
      const status: BudgetStatus =
        percent > 100 ? 'over' : percent >= BUDGET_WARNING_PERCENT ? 'warning' : 'ok';
      return { category, spent, budget, percent, remaining: roundMoney(budget - spent), status };
    });
}

export function filterTransactions(
  transactions: readonly Transaction[],
  filters: TransactionFilters,
  categories: ReadonlyMap<string, Category>,
): Transaction[] {
  const search = filters.search.trim().toLowerCase();

  return transactions.filter((t) => {
    if (filters.type !== 'all' && t.type !== filters.type) return false;
    if (filters.categoryId !== 'all' && t.categoryId !== filters.categoryId) return false;
    if (filters.from && t.date < filters.from) return false;
    if (filters.to && t.date > filters.to) return false;
    if (search) {
      const categoryName = categories.get(t.categoryId)?.name.toLowerCase() ?? '';
      return t.description.toLowerCase().includes(search) || categoryName.includes(search);
    }
    return true;
  });
}

function sumExpensesByCategory(transactions: readonly Transaction[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === 'expense') {
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
    }
  }
  return totals;
}
