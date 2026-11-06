import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { mockFailedResponse, mockProviders, mockQueryResponse } from '../../../../../testing/mock-data';
import { QueryApiService } from '../../../../core/services/query-api.service';
import { HISTORY_STORAGE_KEY } from '../../../../core/services/query-history.service';
import { SystemService } from '../../../../core/services/system.service';
import { QueryPageComponent, pickDefaultProvider } from './query-page.component';

describe('QueryPageComponent', () => {
  let fixture: ComponentFixture<QueryPageComponent>;
  let component: QueryPageComponent;
  let system: jasmine.SpyObj<SystemService>;
  let api: jasmine.SpyObj<QueryApiService>;

  beforeEach(async () => {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    system = jasmine.createSpyObj<SystemService>('SystemService', ['providers', 'health']);
    system.providers.and.returnValue(of(mockProviders()));
    api = jasmine.createSpyObj<QueryApiService>('QueryApiService', ['ask']);

    await TestBed.configureTestingModule({
      imports: [QueryPageComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: SystemService, useValue: system },
        { provide: QueryApiService, useValue: api },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QueryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem(HISTORY_STORAGE_KEY));

  const el = (selector: string): HTMLElement | null => fixture.nativeElement.querySelector(selector);

  it('loads providers and shows the introduction', () => {
    expect(system.providers).toHaveBeenCalled();
    expect(component.providers().length).toBe(2);
    expect(component.defaultProvider()).toBe('groq');
    expect(el('[data-testid="no-provider-alert"]')).toBeNull();
    expect(el('.intro')?.textContent).toContain('The answer appears here');
  });

  it('prefills the question from the ?q= query param', () => {
    fixture.componentRef.setInput('q', 'Show 10 sample rows from orders');
    fixture.detectChanges();
    expect(component.initialQuestion()).toBe('Show 10 sample rows from orders');
    expect((el('[data-testid="question-input"]') as HTMLTextAreaElement).value).toBe('Show 10 sample rows from orders');
  });

  it('warns when no provider has an API key', () => {
    system.providers.and.returnValue(
      of(
        mockProviders({
          providers: [
            { name: 'openai', model: 'm', configured: false, is_default: false },
            { name: 'groq', model: 'm', configured: false, is_default: true },
          ],
        }),
      ),
    );
    component.loadProviders();
    fixture.detectChanges();
    expect(el('[data-testid="no-provider-alert"]')).not.toBeNull();
  });

  it('renders the answer, rows, SQL and attempts after a successful question', () => {
    api.ask.and.returnValue(of(mockQueryResponse()));

    component.onSubmit({ question: 'Top customers by spend', provider: 'groq', max_retries: 3 });
    fixture.detectChanges();

    expect(el('app-answer-card')).not.toBeNull();
    expect(el('app-results-table')).not.toBeNull();
    expect(el('app-sql-viewer')).not.toBeNull();
    expect(el('app-attempts-timeline')).not.toBeNull();
    expect(el('.intro')).toBeNull();
  });

  it('says so when the query matched no rows', () => {
    api.ask.and.returnValue(of(mockQueryResponse({ rows: [], row_count: 0 })));
    component.onSubmit({ question: 'Orders from 1990' });
    fixture.detectChanges();
    expect(el('.no-rows')?.textContent).toContain('matched no rows');
    expect(el('app-results-table')).toBeNull();
  });

  it('shows the failure without a results table', () => {
    api.ask.and.returnValue(of(mockFailedResponse()));

    component.onSubmit({ question: 'impossible question' });
    fixture.detectChanges();

    expect(el('[data-testid="error-text"]')).not.toBeNull();
    expect(el('app-results-table')).toBeNull();
  });

  it('shows request errors', () => {
    api.ask.and.returnValue(throwError(() => ({ status: 0, message: 'Cannot reach the API server.' })));

    component.onSubmit({ question: 'anything at all' });
    fixture.detectChanges();

    expect(el('.notice--error')?.textContent).toContain('Cannot reach the API server.');
  });
});

describe('pickDefaultProvider', () => {
  it('prefers the server default when configured', () => {
    expect(pickDefaultProvider(mockProviders())).toBe('groq');
  });

  it('falls back to the first configured provider', () => {
    const res = mockProviders({
      providers: [
        { name: 'openai', model: 'm', configured: true, is_default: false },
        { name: 'groq', model: 'm', configured: false, is_default: true },
      ],
    });
    expect(pickDefaultProvider(res)).toBe('openai');
  });

  it('returns null when nothing is configured', () => {
    expect(pickDefaultProvider(mockProviders({ providers: [] }))).toBeNull();
  });
});
