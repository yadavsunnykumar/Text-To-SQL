import { DatabaseSchema, ProvidersResponse, QueryResponse } from '../app/core/models';

export function mockQueryResponse(overrides: Partial<QueryResponse> = {}): QueryResponse {
  return {
    success: true,
    question: 'Top customers by spend',
    sql: 'SELECT first_name, SUM(total) AS spend FROM customers GROUP BY 1 ORDER BY 2 DESC LIMIT 3',
    explanation: 'Sums order totals per customer.',
    answer: 'Aarav spent the most (₹1,20,000).',
    columns: ['first_name', 'spend'],
    rows: [
      ['Aarav', 120000],
      ['Meera', 98000.5],
      ['Sam', null],
    ],
    row_count: 3,
    truncated: false,
    attempts: [
      { attempt: 1, sql: 'SELECT nme FROM customers', error: 'no such column: nme', success: false, duration_ms: 420 },
      { attempt: 2, sql: 'SELECT first_name FROM customers', error: null, success: true, duration_ms: 380 },
    ],
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    error: null,
    execution_time_ms: 1530,
    ...overrides,
  };
}

export function mockFailedResponse(overrides: Partial<QueryResponse> = {}): QueryResponse {
  return mockQueryResponse({
    success: false,
    answer: null,
    columns: [],
    rows: [],
    row_count: 0,
    error: 'Could not produce a working query after 3 attempt(s).',
    attempts: [{ attempt: 1, sql: 'SELECT x', error: 'no such column: x', success: false, duration_ms: 100 }],
    ...overrides,
  });
}

export function mockSchema(): DatabaseSchema {
  return {
    dialect: 'sqlite',
    tables: [
      {
        name: 'customers',
        row_count: 80,
        foreign_keys: [],
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primary_key: true },
          { name: 'first_name', type: 'TEXT', nullable: false, primary_key: false },
          { name: 'city', type: 'TEXT', nullable: true, primary_key: false },
        ],
      },
      {
        name: 'orders',
        row_count: 600,
        foreign_keys: [{ columns: ['customer_id'], referred_table: 'customers', referred_columns: ['id'] }],
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primary_key: true },
          { name: 'customer_id', type: 'INTEGER', nullable: false, primary_key: false },
          { name: 'status', type: 'TEXT', nullable: false, primary_key: false },
        ],
      },
    ],
  };
}

export function mockProviders(overrides: Partial<ProvidersResponse> = {}): ProvidersResponse {
  return {
    default: 'groq',
    providers: [
      { name: 'openai', model: 'gpt-4o-mini', configured: true, is_default: false },
      { name: 'groq', model: 'llama-3.3-70b-versatile', configured: true, is_default: true },
    ],
    ...overrides,
  };
}
