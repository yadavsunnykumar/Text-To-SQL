import { CellValue } from '../../core/models';

function escapeCell(value: CellValue | string): string {
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC-4180 style CSV with a header row. */
export function toCsv(columns: string[], rows: CellValue[][]): string {
  const lines = [columns.map(escapeCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(','));
  }
  return lines.join('\r\n');
}
