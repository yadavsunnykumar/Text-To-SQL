import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { CellValue } from '../../../../core/models';
import { CsvExportService } from '../../../../core/services/csv-export.service';
import { CellValuePipe } from '../../../../shared/pipes/cell-value.pipe';

type Row = CellValue[];

@Component({
  selector: 'app-results-table',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    CellValuePipe,
  ],
  templateUrl: './results-table.component.html',
  styleUrl: './results-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsTableComponent {
  readonly columns = input.required<string[]>();
  readonly rows = input.required<Row[]>();
  readonly truncated = input(false);
  readonly exportName = input('query-results');

  private readonly csv = inject(CsvExportService);
  private readonly sort = viewChild(MatSort);
  private readonly paginator = viewChild(MatPaginator);

  readonly dataSource = new MatTableDataSource<Row>([]);
  /** Column ids are positional so duplicate / odd column names still work. */
  readonly columnIds = computed(() => this.columns().map((_, i) => `c${i}`));
  /** Columns whose non-null values are all numbers are right-aligned, like a spreadsheet. */
  readonly numericColumns = computed(() =>
    this.columns().map((_, i) => {
      const values = this.rows()
        .map((row) => row[i])
        .filter((v) => v !== null);
      return values.length > 0 && values.every((v) => typeof v === 'number');
    }),
  );

  constructor() {
    this.dataSource.sortingDataAccessor = (row, id) => {
      const value = row[Number(id.slice(1))];
      return typeof value === 'number' ? value : String(value ?? '').toLowerCase();
    };
    this.dataSource.filterPredicate = (row, filter) =>
      row.some((value) => String(value ?? 'null').toLowerCase().includes(filter));

    effect(() => {
      this.dataSource.data = this.rows();
    });
    effect(() => {
      const sort = this.sort();
      const paginator = this.paginator();
      if (sort) this.dataSource.sort = sort;
      if (paginator) this.dataSource.paginator = paginator;
    });
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  exportCsv(): void {
    // Export what the user is looking at: filtered + sorted, all pages.
    const filtered = this.dataSource.filteredData.slice();
    const sort = this.dataSource.sort;
    const rows = sort ? this.dataSource.sortData(filtered, sort) : filtered;
    this.csv.download(this.exportName(), this.columns(), rows);
  }
}
