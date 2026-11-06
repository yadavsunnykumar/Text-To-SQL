import { ComponentFixture, TestBed } from '@angular/core/testing';

import { mockQueryResponse } from '../../../../../testing/mock-data';
import { AttemptsTimelineComponent } from './attempts-timeline.component';

describe('AttemptsTimelineComponent', () => {
  let fixture: ComponentFixture<AttemptsTimelineComponent>;
  let component: AttemptsTimelineComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AttemptsTimelineComponent] }).compileComponents();
    fixture = TestBed.createComponent(AttemptsTimelineComponent);
    component = fixture.componentInstance;
  });

  const details = (): HTMLDetailsElement => fixture.nativeElement.querySelector('details');
  const summary = (): string =>
    fixture.nativeElement.querySelector('[data-testid="attempts-summary"]').textContent.trim();

  it('lists every attempt with its error and opens when there were retries', () => {
    fixture.componentRef.setInput('attempts', mockQueryResponse().attempts);
    fixture.detectChanges();

    const items: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('[data-testid="attempt"]');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('no such column: nme');
    expect(items[0].textContent).toContain('Failed');
    expect(items[1].classList).toContain('ok');
    expect(items[1].textContent).toContain('Worked');
    expect(component.failedCount()).toBe(1);
    expect(details().open).toBeTrue();
    expect(summary()).toBe('1 query failed and was sent back to the model, then one worked');
  });

  it('stays closed when the first attempt worked', () => {
    fixture.componentRef.setInput('attempts', [
      { attempt: 1, sql: 'SELECT 1', error: null, success: true, duration_ms: 10 },
    ]);
    fixture.detectChanges();

    expect(details().open).toBeFalse();
    expect(summary()).toBe('The first query worked');
  });

  it('describes a run where every attempt failed', () => {
    fixture.componentRef.setInput('attempts', [
      { attempt: 1, sql: 'SELECT a', error: 'bad a', success: false, duration_ms: 10 },
      { attempt: 2, sql: 'SELECT b', error: 'bad b', success: false, duration_ms: 10 },
    ]);
    fixture.detectChanges();
    expect(summary()).toBe('2 queries failed and were sent back to the model');
  });
});
