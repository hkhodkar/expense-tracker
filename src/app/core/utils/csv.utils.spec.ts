import { Category, Transaction } from '../models/finance.models';
import { parseCsv, parseTransactionsCsv, toCsv, transactionsToCsv } from './csv.utils';

describe('csv utils', () => {
  describe('parseCsv', () => {
    it('handles quoted fields with commas, quotes and line breaks', () => {
      const text = 'a,b,c\r\n"hello, world","say ""hi""","multi\nline"\n';
      expect(parseCsv(text)).toEqual([
        ['a', 'b', 'c'],
        ['hello, world', 'say "hi"', 'multi\nline'],
      ]);
    });

    it('ignores blank lines and a leading BOM', () => {
      expect(parseCsv('﻿x,y\n\n1,2\n\n')).toEqual([
        ['x', 'y'],
        ['1', '2'],
      ]);
    });

    it('keeps empty trailing fields', () => {
      expect(parseCsv('a,b,\n')).toEqual([['a', 'b', '']]);
    });
  });

  it('toCsv escapes only when needed and round-trips through parseCsv', () => {
    const rows = [
      ['plain', 'with,comma', 'with "quotes"'],
      ['1', '2', '3'],
    ];
    const csv = toCsv(rows);
    expect(csv.split('\r\n')[0]).toBe('plain,"with,comma","with ""quotes"""');
    expect(parseCsv(csv)).toEqual(rows);
  });

  it('exports transactions with category names', () => {
    const categories = new Map<string, Category>([
      ['food', { id: 'food', name: 'Groceries', type: 'expense', color: '#000', budget: null }],
    ]);
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2026-11-02',
        type: 'expense',
        categoryId: 'food',
        amount: 42.5,
        description: 'Milk, eggs',
      },
    ];

    expect(transactionsToCsv(transactions, categories)).toBe(
      'date,type,category,amount,description\r\n2026-11-02,expense,Groceries,42.50,"Milk, eggs"',
    );
  });

  describe('parseTransactionsCsv', () => {
    it('reads valid rows regardless of column order', () => {
      const text = [
        'Amount,Date,Description,Type,Category',
        '"$1,250.00",2026-11-01,Paycheck,Income,Salary',
        '-12.5,2026-11-03,Coffee,expense,Dining Out',
      ].join('\n');

      expect(parseTransactionsCsv(text)).toEqual({
        rows: [
          {
            date: '2026-11-01',
            type: 'income',
            category: 'Salary',
            amount: 1250,
            description: 'Paycheck',
          },
          {
            date: '2026-11-03',
            type: 'expense',
            category: 'Dining Out',
            amount: 12.5,
            description: 'Coffee',
          },
        ],
        errors: [],
      });
    });

    it('reports invalid rows with their line number', () => {
      const text = [
        'date,type,category,amount',
        '2026-02-30,expense,Food,10',
        '2026-11-01,transfer,Food,10',
        '2026-11-01,expense,,10',
        '2026-11-01,expense,Food,abc',
        '2026-11-01,expense,Food,10',
      ].join('\n');

      const result = parseTransactionsCsv(text);
      expect(result.rows.length).toBe(1);
      expect(result.errors).toEqual([
        'Line 2: invalid date "2026-02-30" (expected YYYY-MM-DD).',
        'Line 3: type must be "income" or "expense".',
        'Line 4: category is missing.',
        'Line 5: invalid amount "abc".',
      ]);
    });

    it('rejects files without the required columns', () => {
      expect(parseTransactionsCsv('date,amount\n2026-11-01,5').errors).toEqual([
        'Missing column(s): type, category.',
      ]);
      expect(parseTransactionsCsv('').errors).toEqual(['The file is empty.']);
    });
  });
});
