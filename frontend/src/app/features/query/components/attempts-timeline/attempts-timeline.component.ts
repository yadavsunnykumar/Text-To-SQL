import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { AttemptLog } from '../../../../core/models';
import { SqlViewerComponent } from '../../../../shared/components/sql-viewer/sql-viewer.component';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';

/** The sequence of tries: the SQL the model wrote and the error that was sent back to it. */
@Component({
  selector: 'app-attempts-timeline',
  imports: [SqlViewerComponent, DurationPipe],
  templateUrl: './attempts-timeline.component.html',
  styleUrl: './attempts-timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttemptsTimelineComponent {
  readonly attempts = input.required<AttemptLog[]>();

  readonly failedCount = computed(() => this.attempts().filter((a) => !a.success).length);
  /** Open by default only when something actually had to be retried. */
  readonly expanded = computed(() => this.attempts().length > 1);

  readonly summary = computed(() => {
    const failed = this.failedCount();
    if (failed === 0) return 'The first query worked';
    const noun = failed === 1 ? 'query failed' : 'queries failed';
    const worked = this.attempts().some((a) => a.success);
    return `${failed} ${noun} and ${failed === 1 ? 'was' : 'were'} sent back to the model${worked ? ', then one worked' : ''}`;
  });
}
