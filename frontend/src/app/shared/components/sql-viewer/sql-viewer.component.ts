import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { NotificationService } from '../../../core/services/notification.service';
import { SqlHighlightPipe } from '../../pipes/sql-highlight.pipe';

@Component({
  selector: 'app-sql-viewer',
  imports: [MatButtonModule, SqlHighlightPipe],
  templateUrl: './sql-viewer.component.html',
  styleUrl: './sql-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SqlViewerComponent {
  readonly sql = input.required<string>();
  readonly title = input('Query used');
  readonly compact = input(false);

  private readonly clipboard = inject(Clipboard);
  private readonly notifications = inject(NotificationService);

  copy(): void {
    if (this.clipboard.copy(this.sql())) {
      this.notifications.success('SQL copied');
    } else {
      this.notifications.error("Couldn't copy the SQL. Select it and copy it manually.");
    }
  }
}
