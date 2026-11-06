import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { mockSchema } from '../../../testing/mock-data';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { SchemaService } from './schema.service';

describe('SchemaService', () => {
  let service: SchemaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api' }],
    });
    service = TestBed.inject(SchemaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches the schema once and serves later calls from cache', () => {
    const results: number[] = [];
    service.getSchema().subscribe((s) => results.push(s.tables.length));
    http.expectOne('/api/schema').flush(mockSchema());

    service.getSchema().subscribe((s) => results.push(s.tables.length));
    http.expectNone('/api/schema');

    expect(results).toEqual([2, 2]);
  });

  it('bypasses the cache with refresh=true', () => {
    service.getSchema().subscribe();
    http.expectOne('/api/schema').flush(mockSchema());

    service.getSchema(true).subscribe();
    const req = http.expectOne((r) => r.url === '/api/schema' && r.params.get('refresh') === 'true');
    req.flush(mockSchema());
  });

  it('does not cache failures', () => {
    const errorSpy = jasmine.createSpy('error');
    service.getSchema().subscribe({ error: errorSpy });
    http.expectOne('/api/schema').flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errorSpy).toHaveBeenCalled();

    service.getSchema().subscribe();
    http.expectOne('/api/schema').flush(mockSchema());
  });
});
