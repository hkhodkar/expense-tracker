import { TestBed } from '@angular/core/testing';
import { FinanceStore, STORAGE_KEY } from './finance-store';

describe('FinanceStore', () => {
  let store: FinanceStore;

  const createStore = () => {
    TestBed.resetTestingModule();
    return TestBed.inject(FinanceStore);
  };

  beforeEach(() => {
    localStorage.clear();
    store = createStore();
  });

  it('seeds demo data on first load', () => {
    expect(store.categories().length).toBeGreaterThan(5);
    expect(store.transactions().length).toBeGreaterThan(50);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('keeps transactions sorted by date, newest first', () => {
    const dates = store.transactions().map((t) => t.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('persists changes and restores them on the next load', () => {
    store.clearTransactions();
    const created = store.addTransaction({
      type: 'expense',
      amount: 12.345,
      categoryId: 'dining',
      date: '2026-11-02',
      description: 'Coffee',
    });

    expect(created.amount).toBe(12.35);

    const reloaded = createStore();
    expect(reloaded.transactions()).toEqual([created]);
    expect(reloaded.totals().expenses).toBe(12.35);
  });

  it('updates and deletes transactions', () => {
    store.clearTransactions();
    const { id } = store.addTransaction({
      type: 'income',
      amount: 100,
      categoryId: 'salary',
      date: '2026-11-01',
      description: 'Bonus',
    });

    store.updateTransaction(id, {
      type: 'income',
      amount: 150,
      categoryId: 'salary',
      date: '2026-11-01',
      description: 'Bonus (corrected)',
    });
    expect(store.transactions()[0]).toMatchObject({
      amount: 150,
      description: 'Bonus (corrected)',
    });

    store.deleteTransaction(id);
    expect(store.transactions()).toEqual([]);
  });

  it('skips duplicates when adding transactions in bulk', () => {
    store.clearTransactions();
    const item = {
      type: 'expense' as const,
      amount: 40,
      categoryId: 'groceries',
      date: '2026-11-03',
      description: 'Aldi',
    };

    expect(store.addTransactions([item, { ...item }])).toEqual({ added: 1, duplicates: 1 });
    expect(store.addTransactions([{ ...item, description: 'aldi ' }])).toEqual({
      added: 0,
      duplicates: 1,
    });
  });

  it('does not delete categories that are still in use', () => {
    expect(store.isCategoryInUse('groceries')).toBe(true);
    expect(store.deleteCategory('groceries')).toBe(false);

    const category = store.addCategory({
      name: ' Pets ',
      type: 'expense',
      color: '#000000',
      budget: 50,
    });
    expect(category.name).toBe('Pets');
    expect(store.deleteCategory(category.id)).toBe(true);
    expect(store.categoryMap().has(category.id)).toBe(false);
  });

  it('falls back to demo data when storage contains garbage', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(createStore().transactions().length).toBeGreaterThan(0);
  });

  it('imports csv rows and creates missing categories', () => {
    store.clearTransactions();
    const result = store.importRows([
      {
        date: '2026-11-01',
        type: 'expense',
        category: 'groceries',
        amount: 20,
        description: 'Aldi',
      },
      { date: '2026-11-02', type: 'expense', category: 'Pets', amount: 35, description: '' },
      { date: '2026-11-03', type: 'expense', category: 'Pets', amount: 12, description: 'Treats' },
    ]);

    expect(result).toEqual({ added: 3, duplicates: 0, newCategories: 1 });
    const pets = store.findCategoryByName('pets', 'expense');
    expect(pets).toBeDefined();
    expect(store.transactions().filter((t) => t.categoryId === pets?.id).length).toBe(2);
    expect(store.transactions().find((t) => t.date === '2026-11-01')?.categoryId).toBe('groceries');
  });
});
