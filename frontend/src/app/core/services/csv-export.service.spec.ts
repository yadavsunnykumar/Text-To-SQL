import { TestBed } from '@angular/core/testing';

import { CsvExportService } from './csv-export.service';

describe('CsvExportService', () => {
  let service: CsvExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CsvExportService);
  });

  it('creates a CSV blob and clicks a download link', () => {
    const createUrl = spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    const revokeUrl = spyOn(URL, 'revokeObjectURL');
    const click = spyOn(HTMLAnchorElement.prototype, 'click');
    const createElement = spyOn(document, 'createElement').and.callThrough();

    service.download('results', ['a', 'b'], [[1, 'x']]);

    const blob = createUrl.calls.mostRecent().args[0] as Blob;
    expect(blob.type).toContain('text/csv');
    const link = createElement.calls.mostRecent().returnValue as HTMLAnchorElement;
    expect(link.download).toBe('results.csv');
    expect(click).toHaveBeenCalled();
    expect(revokeUrl).toHaveBeenCalledWith('blob:test');
  });

  it('does not double the .csv extension', () => {
    spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click');
    const createElement = spyOn(document, 'createElement').and.callThrough();

    service.download('data.csv', ['a'], []);

    expect((createElement.calls.mostRecent().returnValue as HTMLAnchorElement).download).toBe('data.csv');
  });
});
