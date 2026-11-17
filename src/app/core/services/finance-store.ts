import { Injectable, computed, inject, signal } from '@angular/core';
import { DEFAULT_CATEGORIES, createSeedTransactions } from '../data/seed-data';
import { Category, NewCategory, NewTransaction, Transaction } from '../models/finance.models';
import { CsvTransactionRow } from '../utils/csv.utils';
import { calculateTotals, sortByDateDesc } from '../utils/finance.utils';
import { createId, roundMoney } from '../utils/format.utils';
import { StorageService } from './storage.service';

export const STORAGE_KEY = 'expense-tracker.data';

const IMPORT_COLORS = ['#14b8a6', '#f43f5e', '#8b5cf6', '#0ea5e9', '#f59e0b', '#84cc16'];

interface FinanceState {
  categories: Category[];
  transactions: Transaction[];
}

/**
 * Single source of truth for categories and transactions.
 * Every change is written straight to localStorage.
 */
@Injectable({ providedIn: 'root' })
export class FinanceStore {
  private readonly storage = inject(StorageService);
  private readonly state = signal<FinanceState>(this.load());

  readonly categories = computed(() => this.state().categories);
  readonly transactions = computed(() => sortByDateDesc(this.state().transactions));
  readonly categoryMap = computed(() => new Map(this.categories().map((c) => [c.id, c])));
  readonly incomeCategories = computed(() => this.categories().filter((c) => c.type === 'income'));
  readonly expenseCategories = computed(() =>
    this.categories().filter((c) => c.type === 'expense'),
  );
  readonly totals = computed(() => calculateTotals(this.state().transactions));

  addTransaction(input: NewTransaction): Transaction {
    const transaction: Transaction = { ...input, amount: roundMoney(input.amount), id: createId() };
    this.update((state) => ({ ...state, transactions: [...state.transactions, transaction] }));
    return transaction;
  }

  updateTransaction(id: string, changes: NewTransaction): void {
    this.update((state) => ({
      ...state,
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, ...changes, amount: roundMoney(changes.amount) } : t,
      ),
    }));
  }

  deleteTransaction(id: string): void {
    this.update((state) => ({
      ...state,
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
  }

  /** Adds several transactions at once and skips exact duplicates of existing ones. */
  addTransactions(items: NewTransaction[]): { added: number; duplicates: number } {
    const seen = new Set(this.state().transactions.map(duplicateKey));
    const fresh: Transaction[] = [];

    for (const item of items) {
      const key = duplicateKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      fresh.push({ ...item, amount: roundMoney(item.amount), id: createId() });
    }

    if (fresh.length) {
      this.update((state) => ({ ...state, transactions: [...state.transactions, ...fresh] }));
    }
    return { added: fresh.length, duplicates: items.length - fresh.length };
  }

  /** Imports parsed CSV rows, creating any categories that don't exist yet. */
  importRows(rows: CsvTransactionRow[]): {
    added: number;
    duplicates: number;
    newCategories: number;
  } {
    let newCategories = 0;
    const items = rows.map((row) => {
      let category = this.findCategoryByName(row.category, row.type);
      if (!category) {
        category = this.addCategory({
          name: row.category,
          type: row.type,
          color: IMPORT_COLORS[newCategories % IMPORT_COLORS.length],
          budget: null,
        });
        newCategories++;
      }
      return {
        date: row.date,
        type: row.type,
        amount: row.amount,
        categoryId: category.id,
        description: row.description || category.name,
      };
    });

    return { ...this.addTransactions(items), newCategories };
  }

  addCategory(input: NewCategory): Category {
    const category: Category = { ...input, name: input.name.trim(), id: createId() };
    this.update((state) => ({ ...state, categories: [...state.categories, category] }));
    return category;
  }

  updateCategory(id: string, changes: Partial<NewCategory>): void {
    this.update((state) => ({
      ...state,
      categories: state.categories.map((c) => (c.id === id ? { ...c, ...changes } : c)),
    }));
  }

  isCategoryInUse(id: string): boolean {
    return this.state().transactions.some((t) => t.categoryId === id);
  }

  /** Categories that still have transactions can't be removed. */
  deleteCategory(id: string): boolean {
    if (this.isCategoryInUse(id)) {
      return false;
    }
    this.update((state) => ({ ...state, categories: state.categories.filter((c) => c.id !== id) }));
    return true;
  }

  findCategoryByName(name: string, type: Category['type']): Category | undefined {
    const normalized = name.trim().toLowerCase();
    return this.categories().find((c) => c.type === type && c.name.toLowerCase() === normalized);
  }

  resetDemoData(): void {
    this.update(() => createSeedState());
  }

  clearTransactions(): void {
    this.update((state) => ({ ...state, transactions: [] }));
  }

  private update(fn: (state: FinanceState) => FinanceState): void {
    this.state.update(fn);
    this.storage.set(STORAGE_KEY, this.state());
  }

  private load(): FinanceState {
    const saved = this.storage.get<FinanceState>(STORAGE_KEY);
    if (saved && Array.isArray(saved.categories) && Array.isArray(saved.transactions)) {
      return saved;
    }
    // First visit: start with demo data so the app doesn't look empty
    const seeded = createSeedState();
    this.storage.set(STORAGE_KEY, seeded);
    return seeded;
  }
}

function createSeedState(): FinanceState {
  return {
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    transactions: createSeedTransactions(),
  };
}

function duplicateKey(t: NewTransaction): string {
  return [
    t.date,
    t.type,
    t.categoryId,
    roundMoney(t.amount),
    t.description.trim().toLowerCase(),
  ].join('|');
}
