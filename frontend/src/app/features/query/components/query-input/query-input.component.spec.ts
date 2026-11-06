import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { mockProviders } from '../../../../../testing/mock-data';
import { QueryRequest } from '../../../../core/models';
import { QueryInputComponent } from './query-input.component';

describe('QueryInputComponent', () => {
  let fixture: ComponentFixture<QueryInputComponent>;
  let component: QueryInputComponent;
  let emitted: QueryRequest[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueryInputComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(QueryInputComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('providers', mockProviders().providers);
    fixture.componentRef.setInput('defaultProvider', 'groq');
    fixture.componentRef.setInput('examples', ['How many orders?']);
    emitted = [];
    component.submitted.subscribe((req) => emitted.push(req));
    fixture.detectChanges();
  });

  it('preselects the default provider', () => {
    expect(component.form.controls.provider.value).toBe('groq');
  });

  it('emits a trimmed request on submit', () => {
    component.form.controls.question.setValue('   Top 5 products by revenue  ');
    component.form.controls.maxRetries.setValue(2);
    component.submit();

    expect(emitted).toEqual([{ question: 'Top 5 products by revenue', provider: 'groq', max_retries: 2 }]);
  });

  it('does not emit when the question is empty or too short', () => {
    component.form.controls.question.setValue('  ');
    component.submit();
    component.form.controls.question.setValue('hi');
    component.submit();

    expect(emitted).toEqual([]);
    expect(component.form.controls.question.touched).toBeTrue();
  });

  it('does not emit while loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    component.form.controls.question.setValue('How many customers?');
    component.submit();
    expect(emitted).toEqual([]);
  });

  it('submits an example when it is clicked', () => {
    const chip: HTMLElement = fixture.nativeElement.querySelector('.example-link');
    chip.click();
    expect(emitted.length).toBe(1);
    expect(emitted[0].question).toBe('How many orders?');
  });

  it('submits through the form button', () => {
    component.form.controls.question.setValue('Average order value');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="ask-button"]');
    button.click();
    expect(emitted[0].question).toBe('Average order value');
  });

  it('prefills the question from initialQuestion', () => {
    fixture.componentRef.setInput('initialQuestion', 'From history');
    fixture.detectChanges();
    expect(component.form.controls.question.value).toBe('From history');
  });

  it('clears the question', () => {
    component.form.controls.question.setValue('something');
    component.clear();
    expect(component.form.controls.question.value).toBe('');
  });
});
