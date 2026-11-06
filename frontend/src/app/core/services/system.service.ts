import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { HealthResponse, ProvidersResponse } from '../models';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { SKIP_ERROR_TOAST } from '../tokens/http-context.tokens';

@Injectable({ providedIn: 'root' })
export class SystemService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Health check; failures are shown in the header, not as a toast. */
  health(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.baseUrl}/health`, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }

  providers(): Observable<ProvidersResponse> {
    return this.http.get<ProvidersResponse>(`${this.baseUrl}/providers`);
  }
}
