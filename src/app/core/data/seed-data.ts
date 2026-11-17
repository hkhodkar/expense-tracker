import { Category, Transaction, TransactionType } from '../models/finance.models';
import { toIsoDate } from '../utils/date.utils';
import { roundMoney } from '../utils/format.utils';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'salary', name: 'Salary', type: 'income', color: '#10b981', budget: null },
  { id: 'freelance', name: 'Freelance', type: 'income', color: '#0ea5e9', budget: null },
  { id: 'other-income', name: 'Other Income', type: 'income', color: '#84cc16', budget: null },
  { id: 'housing', name: 'Housing', type: 'expense', color: '#6366f1', budget: 1400 },
  { id: 'groceries', name: 'Groceries', type: 'expense', color: '#22c55e', budget: 520 },
  { id: 'dining', name: 'Dining Out', type: 'expense', color: '#f97316', budget: 180 },
  { id: 'transport', name: 'Transport', type: 'expense', color: '#eab308', budget: 200 },
  { id: 'utilities', name: 'Utilities', type: 'expense', color: '#06b6d4', budget: 220 },
  { id: 'entertainment', name: 'Entertainment', type: 'expense', color: '#ec4899', budget: 120 },
  { id: 'shopping', name: 'Shopping', type: 'expense', color: '#a855f7', budget: 250 },
  { id: 'health', name: 'Health & Fitness', type: 'expense', color: '#ef4444', budget: 90 },
  { id: 'subscriptions', name: 'Subscriptions', type: 'expense', color: '#64748b', budget: 40 },
];

/** Small seeded PRNG so the demo data looks the same on every first load. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds roughly three and a half months of realistic transactions
 * (three full months plus the current month up to today).
 */
export function createSeedTransactions(today = new Date(), monthsBack = 3): Transaction[] {
  const random = mulberry32(20240611);
  const between = (min: number, max: number) => roundMoney(min + random() * (max - min));
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  const todayIso = toIsoDate(today);

  const transactions: Transaction[] = [];
  let counter = 0;

  for (let offset = monthsBack; offset >= 0; offset--) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const add = (
      day: number,
      type: TransactionType,
      categoryId: string,
      amount: number,
      description: string,
    ) => {
      const date = toIsoDate(new Date(year, month, Math.min(day, daysInMonth)));
      if (date > todayIso) return;
      transactions.push({ id: `seed-${++counter}`, type, categoryId, amount, date, description });
    };

    // Fixed monthly items
    add(1, 'income', 'salary', 4250, 'Monthly salary - Northwind Labs');
    add(1, 'expense', 'housing', 1350, 'Apartment rent');
    add(3, 'expense', 'subscriptions', 15.49, 'Netflix');
    add(9, 'expense', 'subscriptions', 10.99, 'Spotify Premium');
    add(21, 'expense', 'subscriptions', 2.99, 'iCloud storage');
    add(5, 'expense', 'health', 34.99, 'Gym membership');
    add(8, 'expense', 'utilities', between(68, 112), 'Electricity bill');
    add(14, 'expense', 'utilities', 59.99, 'Home internet');
    add(18, 'expense', 'utilities', between(28, 44), 'Water & sewer');
    add(24, 'expense', 'utilities', 35, 'Mobile phone plan');
    add(26, 'expense', 'housing', between(18, 26), 'Renters insurance');

    // Side income
    add(
      Math.floor(between(10, 20)),
      'income',
      'freelance',
      between(450, 1200),
      pick([
        'Landing page for local bakery',
        'Dashboard redesign project',
        'Website maintenance retainer',
      ]),
    );
    if (random() > 0.6) {
      add(
        Math.floor(between(2, 28)),
        'income',
        'other-income',
        between(25, 120),
        pick(['Sold old monitor', 'Cashback reward', 'Tax refund']),
      );
    }

    // Variable spending spread across the month
    for (let day = 2; day <= daysInMonth; day += Math.floor(between(3, 6))) {
      add(
        day,
        'expense',
        'groceries',
        between(32, 128),
        pick(['Whole Foods', "Trader Joe's", 'Costco', 'Farmers market', 'Aldi']),
      );
    }
    for (let day = 1; day <= daysInMonth; day += Math.floor(between(2, 5))) {
      add(
        day,
        'expense',
        'dining',
        between(9, 58),
        pick([
          'Lunch with the team',
          'Pizza night',
          'Sushi dinner',
          'Coffee & bagel',
          'Thai takeout',
          'Sunday brunch',
        ]),
      );
    }
    for (let day = 4; day <= daysInMonth; day += Math.floor(between(6, 10))) {
      add(
        day,
        'expense',
        'transport',
        between(14, 58),
        pick(['Gas station', 'Uber ride', 'Parking downtown', 'Train ticket']),
      );
    }
    const shoppingTrips = 2 + Math.floor(random() * 2);
    for (let i = 0; i < shoppingTrips; i++) {
      add(
        Math.floor(between(2, 28)),
        'expense',
        'shopping',
        between(22, 145),
        pick([
          'Amazon order',
          'Running shoes',
          'Home supplies',
          'Books',
          'New jacket',
          'Kitchen gadgets',
        ]),
      );
    }
    const outings = 1 + Math.floor(random() * 3);
    for (let i = 0; i < outings; i++) {
      add(
        Math.floor(between(3, 28)),
        'expense',
        'entertainment',
        between(14, 62),
        pick([
          'Movie tickets',
          'Concert tickets',
          'Bowling with friends',
          'Video game',
          'Museum visit',
        ]),
      );
    }
    if (random() > 0.5) {
      add(
        Math.floor(between(6, 26)),
        'expense',
        'health',
        between(12, 48),
        pick(['Pharmacy', 'Vitamins', 'Dentist copay']),
      );
    }
  }

  return transactions.sort((a, b) => b.date.localeCompare(a.date));
}
