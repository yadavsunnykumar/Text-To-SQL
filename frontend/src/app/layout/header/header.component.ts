import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { SystemService } from '../../core/services/system.service';
import { ThemeService } from '../../core/services/theme.service';

export type ApiStatus = 'checking' | 'online' | 'degraded' | 'offline';

interface NavLink {
  path: string;
  label: string;
  exact: boolean;
}

const STATUS_LABELS: Record<ApiStatus, string> = {
  checking: 'Checking API',
  online: 'API connected',
  degraded: 'Database unavailable',
  offline: "Can't reach API",
};

@Component({
  selector: 'app-header',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnInit {
  private readonly system = inject(SystemService);
  readonly theme = inject(ThemeService);
  readonly themeToggleLabel = computed(() =>
    this.theme.isDark() ? 'Switch to light theme' : 'Switch to dark theme',
  );

  readonly status = signal<ApiStatus>('checking');
  readonly statusDetail = signal('Checking the API…');
  readonly statusLabel = computed(() => STATUS_LABELS[this.status()]);

  readonly links: NavLink[] = [
    { path: '/', label: 'Ask', exact: true },
    { path: '/schema', label: 'Schema', exact: false },
    { path: '/history', label: 'History', exact: false },
  ];

  ngOnInit(): void {
    this.checkHealth();
  }

  checkHealth(): void {
    this.status.set('checking');
    this.system.health().subscribe({
      next: (h) => {
        this.status.set(h.status === 'ok' ? 'online' : 'degraded');
        this.statusDetail.set(`Database: ${h.database}. Click to check again.`);
      },
      error: () => {
        this.status.set('offline');
        this.statusDetail.set('The API is unreachable. Start the backend on port 8000, then click to check again.');
      },
    });
  }
}
