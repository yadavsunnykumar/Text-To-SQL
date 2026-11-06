import { InjectionToken } from '@angular/core';

import { environment } from '../../../environments/environment';

/** Base URL of the FastAPI backend. Override in tests or per deployment. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl,
});
