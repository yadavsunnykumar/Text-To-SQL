import { TestBed } from '@angular/core/testing';

import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;
  let originalTheme: string | null;

  beforeEach(() => {
    originalTheme = root.getAttribute('data-theme');
    localStorage.removeItem(THEME_STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    if (originalTheme === null) {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', originalTheme);
    }
  });

  const create = () => {
    TestBed.configureTestingModule({});
    return TestBed.inject(ThemeService);
  };

  it('uses a saved choice and applies it to <html>', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const service = create();
    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBeTrue();
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  it('follows the system preference when nothing is saved', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    expect(create().theme()).toBe('dark');
  });

  it('defaults to light when the system has no dark preference', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    expect(create().theme()).toBe('light');
  });

  it('ignores invalid saved values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    expect(create().theme()).toBe('light');
  });

  it('toggles, applies and remembers the choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const service = create();

    service.toggle();

    expect(service.theme()).toBe('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    service.toggle();
    expect(service.theme()).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });
});
