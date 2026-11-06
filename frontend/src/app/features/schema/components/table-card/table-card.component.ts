import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { TableInfo } from '../../../../core/models';

/** Detail view of one table: its columns, keys and a shortcut to ask about it. */
@Component({
  selector: 'app-table-card',
  imports: [MatButtonModule],
  templateUrl: './table-card.component.html',
  styleUrl: './table-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableCardComponent {
  readonly table = input.required<TableInfo>();
  readonly askAbout = output<string>();

  /** column name -> "table.column" it references */
  readonly fkMap = computed(() => {
    const map = new Map<string, string>();
    for (const fk of this.table().foreign_keys) {
      fk.columns.forEach((col, i) => map.set(col, `${fk.referred_table}.${fk.referred_columns[i] ?? '?'}`));
    }
    return map;
  });

  readonly summary = computed(() => {
    const t = this.table();
    const cols = `${t.columns.length} ${t.columns.length === 1 ? 'column' : 'columns'}`;
    return t.row_count === null ? cols : `${cols}, ${t.row_count.toLocaleString('en-US')} rows`;
  });

  ask(event: Event): void {
    event.stopPropagation();
    this.askAbout.emit(`Show 10 sample rows from ${this.table().name}`);
  }
}
