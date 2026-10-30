import type { BudgetItem } from '../types';

/**
 * Quotes a CSV cell. Cells starting with a formula trigger (= + - @ tab CR) are prefixed with an
 * apostrophe so spreadsheet apps don't execute model- or user-supplied text as a formula.
 */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r']/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function budgetToCsv(items: BudgetItem[]): string {
  const rows = [
    ['Category', 'Amount', 'Priority', 'Status', 'Notes'],
    ...items.map((b) => [b.category, b.amount, b.priority, b.status, b.notes]),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}
