import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { QueryRequest, QueryResponse } from '../models';
import { API_BASE_URL } from '../tokens/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class QueryApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Sends a plain-English question; the backend writes, runs and (if needed) repairs the SQL. */
  ask(request: QueryRequest): Observable<QueryResponse> {
    return this.http.post<QueryResponse>(`${this.baseUrl}/query`, request);
  }
}
