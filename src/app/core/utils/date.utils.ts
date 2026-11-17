/** Formats a Date as YYYY-MM-DD using the local timezone. */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Month key in YYYY-MM format. */
export function currentMonthKey(today = new Date()): string {
  return toIsoDate(today).slice(0, 7);
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  return toIsoDate(new Date(year, month - 1 + delta, 1)).slice(0, 7);
}

/** Returns `count` month keys ending with (and including) `endMonth`, oldest first. */
export function lastMonths(endMonth: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(endMonth, i - count + 1));
}

export function formatMonth(monthKey: string, style: 'long' | 'short' = 'long'): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return style === 'long'
    ? date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : date.toLocaleDateString('en-US', { month: 'short' });
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
