import { Clipboard } from '@angular/cdk/clipboard';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationService } from '../../../core/services/notification.service';
import { SqlViewerComponent } from './sql-viewer.component';

describe('SqlViewerComponent', () => {
  let fixture: ComponentFixture<SqlViewerComponent>;
  let clipboard: jasmine.SpyObj<Clipboard>;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    clipboard = jasmine.createSpyObj<Clipboard>('Clipboard', ['copy']);
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error', 'info']);

    await TestBed.configureTestingModule({
      imports: [SqlViewerComponent],
      providers: [
        { provide: Clipboard, useValue: clipboard },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SqlViewerComponent);
    fixture.componentRef.setInput('sql', "select name from products where price > 100 and name = 'x'");
    fixture.detectChanges();
  });

  it('renders highlighted SQL', () => {
    const code: HTMLElement = fixture.nativeElement.querySelector('code');
    expect(code.textContent).toContain('SELECT name FROM products');
    expect(code.querySelectorAll('.kw').length).toBeGreaterThan(0);
    expect(code.querySelector('.str')?.textContent).toBe("'x'");
    expect(code.querySelector('.num')?.textContent).toBe('100');
  });

  it('copies the SQL and confirms', () => {
    clipboard.copy.and.returnValue(true);
    fixture.nativeElement.querySelector('button.copy-btn').click();
    expect(clipboard.copy).toHaveBeenCalledWith("select name from products where price > 100 and name = 'x'");
    expect(notifications.success).toHaveBeenCalled();
  });

  it('reports copy failures', () => {
    clipboard.copy.and.returnValue(false);
    fixture.componentInstance.copy();
    expect(notifications.error).toHaveBeenCalled();
  });

  it('hides the header in compact mode', () => {
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button.copy-btn')).toBeNull();
  });
});
