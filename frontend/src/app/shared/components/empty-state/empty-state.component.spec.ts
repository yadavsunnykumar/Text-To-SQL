import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EmptyStateComponent] }).compileComponents();
    fixture = TestBed.createComponent(EmptyStateComponent);
  });

  it('renders the title and message', () => {
    fixture.componentRef.setInput('title', 'Nothing here');
    fixture.componentRef.setInput('message', 'Ask something first');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Nothing here');
    expect(fixture.nativeElement.querySelector('p').textContent).toBe('Ask something first');
  });

  it('omits the message paragraph when empty', () => {
    fixture.componentRef.setInput('title', 'Only a title');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p')).toBeNull();
  });
});
