import { Pipe, PipeTransform } from '@angular/core';

import { CellValue } from '../../core/models';

/** Formats a raw result cell for display. */
@Pipe({ name: 'cellValue' })
export class CellValuePipe implements PipeTransform {
  transform(value: CellValue | undefined): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'number' && !Number.isInteger(value)) {
      return Number(value.toFixed(4)).toString();
    }
    return String(value);
  }
}
