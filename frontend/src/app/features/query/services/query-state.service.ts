import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { ApiError, QueryRequest, QueryResponse } from '../../../core/models';
import { QueryApiService } from '../../../core/services/query-api.service';
import { QueryHistoryService } from '../../../core/services/query-history.service';

/** Signal-based store for the query page: keeps the last result alive across navigation. */
@Injectable({ providedIn: 'root' })
export class QueryStateService {
  private readonly api = inject(QueryApiService);
  private readonly history = inject(QueryHistoryService);

  private readonly _loading = signal(false);
  private readonly _response = signal<QueryResponse | null>(null);
  private readonly _error = signal<string | null>(null);
  private readonly _lastQuestion = signal('');

  readonly loading = this._loading.asReadonly();
  readonly response = this._response.asReadonly();
  readonly error = this._error.asReadonly();
  readonly lastQuestion = this._lastQuestion.asReadonly();

  readonly hasRows = computed(() => (this._response()?.rows.length ?? 0) > 0);
  readonly retried = computed(() => (this._response()?.attempts.length ?? 0) > 1);

  ask(request: QueryRequest): void {
    this._loading.set(true);
    this._error.set(null);
    this._lastQuestion.set(request.question);

    this.api
      .ask(request)
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: (response) => {
          this._response.set(response);
          this.history.add(response);
        },
        error: (err: ApiError) => {
          this._response.set(null);
          this._error.set(err?.message ?? 'Something went wrong.');
        },
      });
  }

  reset(): void {
    this._response.set(null);
    this._error.set(null);
    this._lastQuestion.set('');
  }
}
