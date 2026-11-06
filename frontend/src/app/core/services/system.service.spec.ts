import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { mockProviders } from '../../../testing/mock-data';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { SKIP_ERROR_TOAST } from '../tokens/http-context.tokens';
import { SystemService } from './system.service';

describe('SystemService', () => {
  let service: SystemService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api' }],
    });
    service = TestBed.inject(SystemService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('calls /health without error toasts', () => {
    service.health().subscribe((h) => expect(h.status).toBe('ok'));
    const req = http.expectOne('/api/health');
    expect(req.request.context.get(SKIP_ERROR_TOAST)).toBeTrue();
    req.flush({ status: 'ok', app: 'x', database: 'sqlite:up', default_provider: 'groq' });
  });

  it('loads providers', () => {
    service.providers().subscribe((p) => expect(p.providers.length).toBe(2));
    const req = http.expectOne('/api/providers');
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(SKIP_ERROR_TOAST)).toBeFalse();
    req.flush(mockProviders());
  });
});
