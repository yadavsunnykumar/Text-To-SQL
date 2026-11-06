import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { mockQueryResponse } from '../../../testing/mock-data';
import { QueryResponse } from '../models';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { QueryApiService } from './query-api.service';

describe('QueryApiService', () => {
  let service: QueryApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/test-api' }],
    });
    service = TestBed.inject(QueryApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('POSTs the question to /query and returns the response', () => {
    const response = mockQueryResponse();
    let received: QueryResponse | undefined;

    service.ask({ question: 'How many orders?', provider: 'groq', max_retries: 2 }).subscribe((r) => (received = r));

    const req = http.expectOne('/test-api/query');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ question: 'How many orders?', provider: 'groq', max_retries: 2 });
    req.flush(response);

    expect(received).toEqual(response);
  });
});
