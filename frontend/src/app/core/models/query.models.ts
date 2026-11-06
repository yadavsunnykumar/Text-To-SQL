export type ProviderName = 'openai' | 'groq';

export type CellValue = string | number | boolean | null;

export interface QueryRequest {
  question: string;
  provider?: ProviderName | null;
  max_retries?: number | null;
}

export interface AttemptLog {
  attempt: number;
  sql: string | null;
  error: string | null;
  success: boolean;
  duration_ms: number;
}

export interface QueryResponse {
  success: boolean;
  question: string;
  sql: string | null;
  explanation: string | null;
  answer: string | null;
  columns: string[];
  rows: CellValue[][];
  row_count: number;
  truncated: boolean;
  attempts: AttemptLog[];
  provider: string;
  model: string;
  error: string | null;
  execution_time_ms: number;
}
