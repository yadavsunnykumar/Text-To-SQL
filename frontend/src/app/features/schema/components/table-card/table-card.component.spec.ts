import { ComponentFixture, TestBed } from '@angular/core/testing';

import { mockSchema } from '../../../../../testing/mock-data';
import { TableCardComponent } from './table-card.component';

describe('TableCardComponent', () => {
  let fixture: ComponentFixture<TableCardComponent>;
  let component: TableCardComponent;
  const orders = mockSchema().tables[1];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TableCardComponent] }).compileComponents();
    fixture = TestBed.createComponent(TableCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('table', orders);
    fixture.detectChanges();
  });

  it('shows the table name, size and every column', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[data-testid="table-name"]')?.textContent).toContain('orders');
    expect(component.summary()).toBe('3 columns, 600 rows');
    expect(root.querySelectorAll('[data-testid="column-row"]').length).toBe(3);
  });

  it('omits the row count when it is unknown', () => {
    fixture.componentRef.setInput('table', { ...orders, row_count: null });
    fixture.detectChanges();
    expect(component.summary()).toBe('3 columns');
  });

  it('marks primary and foreign keys', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('[data-testid="pk-badge"]').length).toBe(1);
    expect(root.querySelector('[data-testid="fk-badge"]')?.textContent).toContain('customers.id');
    expect(component.fkMap().get('customer_id')).toBe('customers.id');
  });

  it('emits a starter question', () => {
    const emitted: string[] = [];
    component.askAbout.subscribe((q) => emitted.push(q));
    const event = new MouseEvent('click');
    spyOn(event, 'stopPropagation');

    component.ask(event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(emitted).toEqual(['Show 10 sample rows from orders']);
  });
});
