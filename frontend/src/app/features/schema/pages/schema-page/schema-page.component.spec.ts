import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { mockSchema } from '../../../../../testing/mock-data';
import { SchemaService } from '../../../../core/services/schema.service';
import { SchemaPageComponent } from './schema-page.component';

describe('SchemaPageComponent', () => {
  let fixture: ComponentFixture<SchemaPageComponent>;
  let component: SchemaPageComponent;
  let schemaService: jasmine.SpyObj<SchemaService>;

  beforeEach(async () => {
    schemaService = jasmine.createSpyObj<SchemaService>('SchemaService', ['getSchema']);
    schemaService.getSchema.and.returnValue(of(mockSchema()));

    await TestBed.configureTestingModule({
      imports: [SchemaPageComponent],
      providers: [provideNoopAnimations(), provideRouter([]), { provide: SchemaService, useValue: schemaService }],
    }).compileComponents();

    fixture = TestBed.createComponent(SchemaPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const indexItems = (): NodeListOf<HTMLElement> =>
    fixture.nativeElement.querySelectorAll('[data-testid="table-index-item"]');
  const detailName = (): string =>
    fixture.nativeElement.querySelector('app-table-card [data-testid="table-name"]').textContent.trim();

  it('lists every table and shows the first one in detail', () => {
    expect(schemaService.getSchema).toHaveBeenCalledWith(false);
    expect(indexItems().length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('app-table-card').length).toBe(1);
    expect(detailName()).toBe('customers');
    expect(fixture.nativeElement.querySelector('[data-testid="schema-summary"]').textContent).toContain(
      '2 tables and 6 columns in the sqlite database',
    );
  });

  it('shows a table when it is picked from the index', () => {
    indexItems()[1].click();
    fixture.detectChanges();
    expect(detailName()).toBe('orders');
    expect(indexItems()[1].classList).toContain('is-active');
  });

  it('filters by table or column name', () => {
    component.onFilter({ target: { value: 'customer_id' } } as unknown as Event);
    fixture.detectChanges();
    expect(component.filteredTables().map((t) => t.name)).toEqual(['orders']);
    expect(indexItems().length).toBe(1);
    expect(detailName()).toBe('orders');
  });

  it('explains when nothing matches the filter', () => {
    component.onFilter({ target: { value: 'zzz' } } as unknown as Event);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No table or column matches “zzz”');
    expect(fixture.nativeElement.querySelector('app-table-card')).toBeNull();
  });

  it('reloads from the server', () => {
    component.load(true);
    expect(schemaService.getSchema).toHaveBeenCalledWith(true);
  });

  it('navigates to the Ask page with a starter question', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.askAbout('Show 10 sample rows from orders');
    expect(navigate).toHaveBeenCalledWith(['/'], { queryParams: { q: 'Show 10 sample rows from orders' } });
  });

  it('shows an error state when loading fails', () => {
    schemaService.getSchema.and.returnValue(throwError(() => ({ status: 500, message: 'DB down' })));
    component.load(true);
    fixture.detectChanges();
    expect(component.error()).toBe('DB down');
    expect(fixture.nativeElement.textContent).toContain("Couldn't load the schema");
  });
});
