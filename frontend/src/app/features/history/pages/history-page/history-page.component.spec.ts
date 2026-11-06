import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';

import { mockFailedResponse, mockQueryResponse } from '../../../../../testing/mock-data';
import { NotificationService } from '../../../../core/services/notification.service';
import { HISTORY_STORAGE_KEY, QueryHistoryService } from '../../../../core/services/query-history.service';
import { HistoryPageComponent } from './history-page.component';

describe('HistoryPageComponent', () => {
  let fixture: ComponentFixture<HistoryPageComponent>;
  let component: HistoryPageComponent;
  let history: QueryHistoryService;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['info', 'error', 'success']);

    await TestBed.configureTestingModule({
      imports: [HistoryPageComponent],
      providers: [provideNoopAnimations(), provideRouter([]), { provide: NotificationService, useValue: notifications }],
    }).compileComponents();

    history = TestBed.inject(QueryHistoryService);
    fixture = TestBed.createComponent(HistoryPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => localStorage.removeItem(HISTORY_STORAGE_KEY));

  const items = (): NodeListOf<HTMLElement> => fixture.nativeElement.querySelectorAll('[data-testid="history-item"]');

  it('shows an empty state when there is no history', () => {
    fixture.detectChanges();
    expect(items().length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No questions yet');
  });

  it('lists saved questions newest first', () => {
    history.add(mockQueryResponse({ question: 'older' }));
    history.add(mockFailedResponse({ question: 'newer' }));
    fixture.detectChanges();

    expect(items().length).toBe(2);
    expect(items()[0].textContent).toContain('newer');
  });

  it('re-runs a question on the query page', () => {
    const entry = history.add(mockQueryResponse({ question: 'again please' }));
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    component.rerun(entry);

    expect(navigate).toHaveBeenCalledWith(['/'], { queryParams: { q: 'again please' } });
  });

  it('removes one entry and clears all', () => {
    const entry = history.add(mockQueryResponse({ question: 'one' }));
    history.add(mockQueryResponse({ question: 'two' }));

    component.remove(entry);
    fixture.detectChanges();
    expect(items().length).toBe(1);

    component.clearAll();
    fixture.detectChanges();
    expect(items().length).toBe(0);
    expect(notifications.info).toHaveBeenCalledWith('History cleared');
  });
});
