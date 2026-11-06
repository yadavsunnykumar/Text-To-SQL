import { ProviderName } from './query.models';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  app: string;
  database: string;
  default_provider: ProviderName;
}

export interface ProviderInfo {
  name: ProviderName;
  model: string;
  configured: boolean;
  is_default: boolean;
}

export interface ProvidersResponse {
  default: ProviderName;
  providers: ProviderInfo[];
}

/** Normalised error shape produced by the HTTP error interceptor. */
export interface ApiError {
  status: number;
  message: string;
}
