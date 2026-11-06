import { TestBed } from '@angular/core/testing';

import { mockFailedResponse, mockQueryResponse } from '../../../testing/mock-data';
import { HISTORY_LIMIT, HISTORY_STORAGE_KEY, QueryHistoryService } from './query-history.service';

describe('QueryHistoryService', () => {
  beforeEach(() => localStorage.removeItem(HISTORY_STORAGE_KEY));
  afterEach(() => localStorage.removeItem(HISTORY_STORAGE_KEY));

  const create = () => {
    TestBed.configureTestingModule({});
    return TestBed.inject(QueryHistoryService);
  };

  it('starts empty', () => {
    expect(create().entries()).toEqual([]);
  });

  it('adds newest entries first and persists them', () => {
    const service = create();
    service.add(mockQueryResponse({ question: 'first' }));
    service.add(mockFailedResponse({ question: 'second' }));

    const entries = service.entries();
    expect(entries.map((e) => e.question)).toEqual(['second', 'first']);
    expect(entries[0].success).toBeFalse();
    expect(entries[1].rowCount).toBe(3);

    const stored = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) ?? '[]');
    expect(stored.length).toBe(2);
  });

  it(`keeps at most ${HISTORY_LIMIT} entries`, () => {
    const service = create();
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      service.add(mockQueryResponse({ question: `q${i}` }));
    }
    expect(service.entries().length).toBe(HISTORY_LIMIT);
    expect(service.entries()[0].question).toBe(`q${HISTORY_LIMIT + 4}`);
  });

  it('removes one entry and clears all', () => {
    const service = create();
    const a = service.add(mockQueryResponse({ question: 'a' }));
    service.add(mockQueryResponse({ question: 'b' }));

    service.remove(a.id);
    expect(service.entries().map((e) => e.question)).toEqual(['b']);

    service.clear();
    expect(service.entries()).toEqual([]);
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBe('[]');
  });

  it('restores saved entries and ignores corrupt storage', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, '{not json');
    expect(create().entries()).toEqual([]);
  });

  it('loads entries saved by a previous session', () => {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([
        { id: '1', question: 'saved', sql: null, success: true, provider: 'groq', rowCount: 1, createdAt: '' },
      ]),
    );
    expect(create().entries()[0].question).toBe('saved');
  });
});
