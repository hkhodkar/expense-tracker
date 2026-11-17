export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  /** Monthly limit in USD. Only used for expense categories. */
  budget: number | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  /** Local date in YYYY-MM-DD format */
  date: string;
  description: string;
}

export type NewTransaction = Omit<Transaction, 'id'>;
export type NewCategory = Omit<Category, 'id'>;

export interface TransactionFilters {
  search: string;
  type: TransactionType | 'all';
  categoryId: string;
  from: string;
  to: string;
}

export const EMPTY_FILTERS: TransactionFilters = {
  search: '',
  type: 'all',
  categoryId: 'all',
  from: '',
  to: '',
};
