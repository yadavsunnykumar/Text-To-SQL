import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

/** Must match the key used by the inline script in index.html. */
export const THEME_STORAGE_KEY = 'tts.theme';

/**
 * Light / dark theme. Follows the operating system until the user picks one,
 * then remembers that choice. The theme is applied as data-theme on <html>.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly _theme = signal<Theme>(this.initialTheme());

  readonly theme = this._theme.asReadonly();
  readonly isDark = computed(() => this._theme() === 'dark');

  constructor() {
    this.apply(this._theme());
  }

  toggle(): void {
    this.set(this.isDark() ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this._theme.set(theme);
    this.apply(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage unavailable: the choice lasts for this page view only.
    }
  }

  private initialTheme(): Theme {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      // ignore
    }
    const prefersDark = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    return prefersDark ? 'dark' : 'light';
  }

  private apply(theme: Theme): void {
    this.document.documentElement.setAttribute('data-theme', theme);
  }
}
