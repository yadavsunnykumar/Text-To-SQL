import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    TestBed.configureTestingModule({ providers: [{ provide: MatSnackBar, useValue: snackBar }] });
    service = TestBed.inject(NotificationService);
  });

  it('shows success messages with the success style', () => {
    service.success('Saved');
    expect(snackBar.open).toHaveBeenCalledWith('Saved', 'OK', jasmine.objectContaining({ panelClass: 'snack-success' }));
  });

  it('shows errors longer and with the error style', () => {
    service.error('Boom');
    expect(snackBar.open).toHaveBeenCalledWith(
      'Boom',
      'Dismiss',
      jasmine.objectContaining({ panelClass: 'snack-error', duration: 6000 }),
    );
  });

  it('shows plain info messages', () => {
    service.info('FYI');
    expect(snackBar.open).toHaveBeenCalledWith('FYI', undefined, jasmine.objectContaining({ duration: 3000 }));
  });
});
