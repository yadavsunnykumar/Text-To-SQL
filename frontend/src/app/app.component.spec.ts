import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { SystemService } from './core/services/system.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    const system = jasmine.createSpyObj<SystemService>('SystemService', ['health', 'providers']);
    system.health.and.returnValue(of({ status: 'ok', app: 'x', database: 'sqlite:up', default_provider: 'groq' }));

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), { provide: SystemService, useValue: system }],
    }).compileComponents();
  });

  it('renders the header and a router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('app-header')).not.toBeNull();
    expect(root.querySelector('main router-outlet')).not.toBeNull();
  });
});
