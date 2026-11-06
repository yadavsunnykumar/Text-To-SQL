import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { ProviderInfo, ProviderName, ProvidersResponse, QueryRequest } from '../../../../core/models';
import { SystemService } from '../../../../core/services/system.service';
import { SqlViewerComponent } from '../../../../shared/components/sql-viewer/sql-viewer.component';
import { AnswerCardComponent } from '../../components/answer-card/answer-card.component';
import { AttemptsTimelineComponent } from '../../components/attempts-timeline/attempts-timeline.component';
import { QueryInputComponent } from '../../components/query-input/query-input.component';
import { ResultsTableComponent } from '../../components/results-table/results-table.component';
import { EXAMPLE_QUESTIONS } from '../../constants/example-questions';
import { QueryStateService } from '../../services/query-state.service';

/** Picks the server default if it has a key, otherwise the first configured provider. */
export function pickDefaultProvider(res: ProvidersResponse): ProviderName | null {
  const configured = res.providers.filter((p) => p.configured);
  return configured.find((p) => p.name === res.default)?.name ?? configured[0]?.name ?? null;
}

@Component({
  selector: 'app-query-page',
  imports: [
    MatProgressBarModule,
    RouterLink,
    AnswerCardComponent,
    AttemptsTimelineComponent,
    QueryInputComponent,
    ResultsTableComponent,
    SqlViewerComponent,
  ],
  templateUrl: './query-page.component.html',
  styleUrl: './query-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueryPageComponent implements OnInit {
  readonly state = inject(QueryStateService);
  private readonly system = inject(SystemService);

  /** Bound from the `?q=` query param (router uses withComponentInputBinding). */
  readonly q = input<string | undefined>(undefined);

  readonly examples = EXAMPLE_QUESTIONS;
  readonly providers = signal<ProviderInfo[]>([]);
  readonly defaultProvider = signal<ProviderName | null>(null);
  readonly noProviderConfigured = signal(false);
  readonly initialQuestion = computed(() => this.q() ?? '');

  ngOnInit(): void {
    this.loadProviders();
  }

  loadProviders(): void {
    this.system.providers().subscribe({
      next: (res) => {
        this.providers.set(res.providers);
        const preferred = pickDefaultProvider(res);
        this.defaultProvider.set(preferred);
        this.noProviderConfigured.set(preferred === null);
      },
      error: () => this.providers.set([]),
    });
  }

  onSubmit(request: QueryRequest): void {
    this.state.ask(request);
  }
}
