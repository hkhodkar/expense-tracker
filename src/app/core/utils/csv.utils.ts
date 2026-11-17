import { Category, Transaction, TransactionType } from '../models/finance.models';
import { isValidIsoDate } from './date.utils';
import { roundMoney } from './format.utils';

export const CSV_COLUMNS = ['date', 'type', 'category', 'amount', 'description'] as const;

export interface CsvTransactionRow {
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
}

export interface CsvParseResult {
  rows: CsvTransactionRow[];
  errors: string[];
}

/** Parses CSV text (RFC 4180 style: quoted fields, escaped quotes, CRLF line endings). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const input = text.replace(/^﻿/, '');

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  // drop blank lines
  return rows.filter((r) => r.some((value) => value.trim() !== ''));
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number>>): string {
  return rows.map((row) => row.map(escapeField).join(',')).join('\r\n');
}

export function transactionsToCsv(
  transactions: readonly Transaction[],
  categories: ReadonlyMap<string, Category>,
): string {
  return toCsv([
    [...CSV_COLUMNS],
    ...transactions.map((t) => [
      t.date,
      t.type,
      categories.get(t.categoryId)?.name ?? 'Uncategorized',
      t.amount.toFixed(2),
      t.description,
    ]),
  ]);
}

/**
 * Reads transactions from CSV. Column order doesn't matter as long as the header
 * contains date, type, category and amount. Invalid rows are reported, not thrown.
 */
export function parseTransactionsCsv(text: string): CsvParseResult {
  const [header, ...lines] = parseCsv(text);
  if (!header) {
    return { rows: [], errors: ['The file is empty.'] };
  }

  const columns = header.map((h) => h.trim().toLowerCase());
  const index = (name: string) => columns.indexOf(name);
  const missing = CSV_COLUMNS.filter((c) => c !== 'description' && index(c) === -1);
  if (missing.length) {
    return { rows: [], errors: [`Missing column(s): ${missing.join(', ')}.`] };
  }

  const rows: CsvTransactionRow[] = [];
  const errors: string[] = [];

  lines.forEach((line, i) => {
    const lineNumber = i + 2; // header is line 1
    const value = (name: string) => (line[index(name)] ?? '').trim();

    const date = value('date');
    const type = value('type').toLowerCase();
    const category = value('category');
    const amount = parseAmount(value('amount'));

    if (!isValidIsoDate(date)) {
      errors.push(`Line ${lineNumber}: invalid date "${date}" (expected YYYY-MM-DD).`);
    } else if (type !== 'income' && type !== 'expense') {
      errors.push(`Line ${lineNumber}: type must be "income" or "expense".`);
    } else if (!category) {
      errors.push(`Line ${lineNumber}: category is missing.`);
    } else if (amount === null || amount <= 0) {
      errors.push(`Line ${lineNumber}: invalid amount "${value('amount')}".`);
    } else {
      rows.push({
        date,
        type,
        category,
        amount,
        description: index('description') === -1 ? '' : value('description'),
      });
    }
  });

  return { rows, errors };
}

function parseAmount(raw: string): number | null {
  // tolerate "$1,234.50" and negative expenses like "-12.00"
  const cleaned = raw.replace(/[$,\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return roundMoney(Math.abs(Number(cleaned)));
}

function escapeField(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
