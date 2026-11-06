import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { SystemService } from '../../core/services/system.service';
import { THEME_STORAGE_KEY, ThemeService } from '../../core/services/theme.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let component: HeaderComponent;
  let system: jasmine.SpyObj<SystemService>;

  let originalTheme: string | null;

  beforeEach(async () => {
    originalTheme = document.documentElement.getAttribute('data-theme');
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    system = jasmine.createSpyObj<SystemService>('SystemService', ['health', 'providers']);
    system.health.and.returnValue(of({ status: 'ok', app: 'x', database: 'sqlite:up', default_provider: 'groq' }));

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [provideRouter([]), { provide: SystemService, useValue: system }],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the navigation links', () => {
    const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('nav a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/', '/schema', '/history']);
  });

  it('shows the API as online when healthy', () => {
    expect(component.status()).toBe('online');
    expect(fixture.nativeElement.querySelector('[data-testid="status-dot"]').classList).toContain('online');
  });

  it('shows degraded and offline states', () => {
    system.health.and.returnValue(of({ status: 'degraded', app: 'x', database: 'sqlite:down', default_provider: 'groq' }));
    component.checkHealth();
    expect(component.status()).toBe('degraded');

    system.health.and.returnValue(throwError(() => new Error('down')));
    component.checkHealth();
    expect(component.status()).toBe('offline');
    expect(component.statusDetail()).toContain('unreachable');
  });

  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    if (originalTheme === null) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', originalTheme);
    }
  });

  it('switches between light and dark themes', () => {
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="theme-toggle"]');
    expect(toggle.getAttribute('aria-label')).toBe('Switch to dark theme');

    toggle.click();
    fixture.detectChanges();

    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(toggle.getAttribute('aria-label')).toBe('Switch to light theme');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});
