import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';

import { DatabaseSchema } from '../models';
import { API_BASE_URL } from '../tokens/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class SchemaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private cache$: Observable<DatabaseSchema> | null = null;

  /** Returns the database schema, cached for the session unless `refresh` is true. */
  getSchema(refresh = false): Observable<DatabaseSchema> {
    if (!this.cache$ || refresh) {
      const params = refresh ? new HttpParams().set('refresh', 'true') : undefined;
      this.cache$ = this.http.get<DatabaseSchema>(`${this.baseUrl}/schema`, { params }).pipe(
        catchError((err) => {
          this.cache$ = null; // don't cache failures
          return throwError(() => err);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.cache$;
  }
}
