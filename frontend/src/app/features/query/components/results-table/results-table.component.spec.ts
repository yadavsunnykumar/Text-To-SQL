import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { mockQueryResponse } from '../../../../../testing/mock-data';
import { CsvExportService } from '../../../../core/services/csv-export.service';
import { ResultsTableComponent } from './results-table.component';

describe('ResultsTableComponent', () => {
  let fixture: ComponentFixture<ResultsTableComponent>;
  let component: ResultsTableComponent;
  let csv: jasmine.SpyObj<CsvExportService>;
  const response = mockQueryResponse();

  beforeEach(async () => {
    csv = jasmine.createSpyObj<CsvExportService>('CsvExportService', ['download']);
    await TestBed.configureTestingModule({
      imports: [ResultsTableComponent],
      providers: [provideNoopAnimations(), { provide: CsvExportService, useValue: csv }],
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('columns', response.columns);
    fixture.componentRef.setInput('rows', response.rows);
    fixture.componentRef.setInput('exportName', 'my-export');
    fixture.detectChanges();
  });

  it('renders a header per column and a row per result', () => {
    const headers: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('th'));
    expect(headers.map((h) => h.textContent?.trim())).toEqual(['first_name', 'spend']);
    expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row').length).toBe(3);
  });

  it('shows NULL for null cells', () => {
    const nullCell: HTMLElement = fixture.nativeElement.querySelector('td.null-cell');
    expect(nullCell.textContent?.trim()).toBe('NULL');
  });

  it('filters rows case-insensitively', () => {
    component.applyFilter({ target: { value: '  MEERA ' } } as unknown as Event);
    fixture.detectChanges();
    expect(component.dataSource.filteredData.length).toBe(1);
    expect(component.dataSource.filteredData[0][0]).toBe('Meera');
  });

  it('exports the filtered rows to CSV', () => {
    component.applyFilter({ target: { value: 'sam' } } as unknown as Event);
    component.exportCsv();
    expect(csv.download).toHaveBeenCalledWith('my-export', ['first_name', 'spend'], [['Sam', null]]);
  });

  it('right-aligns columns that only hold numbers', () => {
    expect(component.numericColumns()).toEqual([false, true]);
    const headers: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('th');
    expect(headers[1].classList).toContain('num');
    expect(headers[0].classList).not.toContain('num');
  });

  it('shows the row count, and the filtered count while filtering', () => {
    const count = () => fixture.nativeElement.querySelector('[data-testid="row-count"]').textContent.trim();
    expect(count()).toBe('3');
    component.applyFilter({ target: { value: 'meera' } } as unknown as Event);
    fixture.detectChanges();
    expect(count()).toBe('1 of 3');
  });

  it('sorts numbers numerically', () => {
    const accessor = component.dataSource.sortingDataAccessor;
    expect(accessor(['x', 5], 'c1')).toBe(5);
    expect(accessor(['ABC', 5], 'c0')).toBe('abc');
  });
});
