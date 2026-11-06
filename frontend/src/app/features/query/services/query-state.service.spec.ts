import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { mockQueryResponse } from '../../../../testing/mock-data';
import { QueryResponse } from '../../../core/models';
import { QueryApiService } from '../../../core/services/query-api.service';
import { QueryHistoryService } from '../../../core/services/query-history.service';
import { QueryStateService } from './query-state.service';

describe('QueryStateService', () => {
  let state: QueryStateService;
  let api: jasmine.SpyObj<QueryApiService>;
  let history: jasmine.SpyObj<QueryHistoryService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<QueryApiService>('QueryApiService', ['ask']);
    history = jasmine.createSpyObj<QueryHistoryService>('QueryHistoryService', ['add']);
    TestBed.configureTestingModule({
      providers: [
        { provide: QueryApiService, useValue: api },
        { provide: QueryHistoryService, useValue: history },
      ],
    });
    state = TestBed.inject(QueryStateService);
  });

  it('tracks loading while the request is in flight', () => {
    const pending = new Subject<QueryResponse>();
    api.ask.and.returnValue(pending.asObservable());

    state.ask({ question: 'How many orders?' });
    expect(state.loading()).toBeTrue();
    expect(state.lastQuestion()).toBe('How many orders?');

    pending.next(mockQueryResponse());
    pending.complete();
    expect(state.loading()).toBeFalse();
  });

  it('stores the response and records it in history', () => {
    const response = mockQueryResponse();
    api.ask.and.returnValue(of(response));

    state.ask({ question: 'Top customers', provider: 'groq', max_retries: 2 });

    expect(api.ask).toHaveBeenCalledWith({ question: 'Top customers', provider: 'groq', max_retries: 2 });
    expect(state.response()).toEqual(response);
    expect(state.error()).toBeNull();
    expect(state.hasRows()).toBeTrue();
    expect(state.retried()).toBeTrue();
    expect(history.add).toHaveBeenCalledWith(response);
  });

  it('exposes API errors and clears the previous response', () => {
    api.ask.and.returnValue(of(mockQueryResponse()));
    state.ask({ question: 'first' });

    api.ask.and.returnValue(throwError(() => ({ status: 0, message: 'Cannot reach the API server.' })));
    state.ask({ question: 'second' });

    expect(state.response()).toBeNull();
    expect(state.error()).toBe('Cannot reach the API server.');
    expect(state.loading()).toBeFalse();
  });

  it('resets everything', () => {
    api.ask.and.returnValue(of(mockQueryResponse()));
    state.ask({ question: 'x y z' });
    state.reset();
    expect(state.response()).toBeNull();
    expect(state.lastQuestion()).toBe('');
    expect(state.hasRows()).toBeFalse();
  });
});
