import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';

import { HistoryEntry } from '../../../../core/models';
import { NotificationService } from '../../../../core/services/notification.service';
import { QueryHistoryService } from '../../../../core/services/query-history.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-history-page',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatTooltipModule, RouterLink, EmptyStateComponent],
  templateUrl: './history-page.component.html',
  styleUrl: './history-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPageComponent {
  readonly history = inject(QueryHistoryService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  rerun(entry: HistoryEntry): void {
    void this.router.navigate(['/'], { queryParams: { q: entry.question } });
  }

  remove(entry: HistoryEntry): void {
    this.history.remove(entry.id);
  }

  clearAll(): void {
    this.history.clear();
    this.notifications.info('History cleared');
  }
}
