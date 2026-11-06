import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';

import { ApiError, DatabaseSchema, TableInfo } from '../../../../core/models';
import { SchemaService } from '../../../../core/services/schema.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { TableCardComponent } from '../../components/table-card/table-card.component';

@Component({
  selector: 'app-schema-page',
  imports: [MatButtonModule, MatProgressBarModule, EmptyStateComponent, TableCardComponent],
  templateUrl: './schema-page.component.html',
  styleUrl: './schema-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchemaPageComponent implements OnInit {
  private readonly schemaService = inject(SchemaService);
  private readonly router = inject(Router);

  readonly schema = signal<DatabaseSchema | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly filter = signal('');
  private readonly selectedName = signal<string | null>(null);

  readonly filteredTables = computed(() => {
    const tables = this.schema()?.tables ?? [];
    const term = this.filter().trim().toLowerCase();
    if (!term) return tables;
    return tables.filter(
      (t) => t.name.toLowerCase().includes(term) || t.columns.some((c) => c.name.toLowerCase().includes(term)),
    );
  });

  /** The chosen table, or the first one that matches the filter. */
  readonly selected = computed<TableInfo | null>(() => {
    const tables = this.filteredTables();
    return tables.find((t) => t.name === this.selectedName()) ?? tables[0] ?? null;
  });

  readonly summary = computed(() => {
    const s = this.schema();
    if (!s) return '';
    const columns = s.tables.reduce((sum, t) => sum + t.columns.length, 0);
    return `${s.tables.length} tables and ${columns} columns in the ${s.dialect} database`;
  });

  ngOnInit(): void {
    this.load();
  }

  load(refresh = false): void {
    this.loading.set(true);
    this.error.set(null);
    this.schemaService.getSchema(refresh).subscribe({
      next: (schema) => {
        this.schema.set(schema);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  select(name: string): void {
    this.selectedName.set(name);
  }

  onFilter(event: Event): void {
    this.filter.set((event.target as HTMLInputElement).value);
  }

  askAbout(question: string): void {
    void this.router.navigate(['/'], { queryParams: { q: question } });
  }
}
