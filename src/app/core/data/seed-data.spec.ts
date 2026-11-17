import { DEFAULT_CATEGORIES, createSeedTransactions } from './seed-data';

describe('createSeedTransactions', () => {
  const today = new Date(2026, 10, 17);

  it('is deterministic', () => {
    expect(createSeedTransactions(today)).toEqual(createSeedTransactions(today));
  });

  it('never creates transactions in the future', () => {
    const transactions = createSeedTransactions(today);
    expect(transactions.every((t) => t.date <= '2026-11-17')).toBe(true);
    expect(transactions.some((t) => t.date < '2026-08-15')).toBe(true);
  });

  it('only uses known categories', () => {
    const ids = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
    expect(createSeedTransactions(today).every((t) => ids.has(t.categoryId))).toBe(true);
  });
});
