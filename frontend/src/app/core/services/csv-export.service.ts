import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

import { toCsv } from '../../shared/utils/csv.util';
import { CellValue } from '../models';

@Injectable({ providedIn: 'root' })
export class CsvExportService {
  private readonly document = inject(DOCUMENT);

  download(filename: string, columns: string[], rows: CellValue[][]): void {
    const blob = new Blob([toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
