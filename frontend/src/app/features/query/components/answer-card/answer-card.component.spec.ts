import { ComponentFixture, TestBed } from '@angular/core/testing';

import { mockFailedResponse, mockQueryResponse } from '../../../../../testing/mock-data';
import { AnswerCardComponent } from './answer-card.component';

describe('AnswerCardComponent', () => {
  let fixture: ComponentFixture<AnswerCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AnswerCardComponent] }).compileComponents();
    fixture = TestBed.createComponent(AnswerCardComponent);
  });

  const text = (selector: string): string =>
    (fixture.nativeElement.querySelector(selector) as HTMLElement | null)?.textContent?.trim() ?? '';

  it('shows the plain-English answer and the facts on success', () => {
    fixture.componentRef.setInput('response', mockQueryResponse());
    fixture.detectChanges();

    expect(text('[data-testid="answer-text"]')).toContain('Aarav spent the most');
    expect(fixture.nativeElement.querySelector('[data-testid="answer-card"]').classList).not.toContain('failed');
    expect(text('[data-testid="fact-rows"]')).toBe('3');
    expect(text('[data-testid="fact-attempts"]')).toBe('2');
    expect(text('[data-testid="fact-time"]')).toBe('1.53 s');
  });

  it('notes when the row limit was reached', () => {
    fixture.componentRef.setInput('response', mockQueryResponse({ truncated: true }));
    fixture.detectChanges();
    expect(text('[data-testid="fact-rows"]')).toBe('3 (limit reached)');
  });

  it('falls back to a generic message when no answer was generated', () => {
    fixture.componentRef.setInput('response', mockQueryResponse({ answer: null }));
    fixture.detectChanges();
    expect(text('[data-testid="answer-text"]')).toContain('ran successfully');
  });

  it('shows the error and hides the row count when the query failed', () => {
    fixture.componentRef.setInput('response', mockFailedResponse());
    fixture.detectChanges();

    expect(text('[data-testid="error-text"]')).toContain('Could not produce a working query');
    expect(fixture.nativeElement.querySelector('[data-testid="answer-card"]').classList).toContain('failed');
    expect(fixture.nativeElement.querySelector('[data-testid="fact-rows"]')).toBeNull();
  });
});
