import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { QueryResponse } from '../../../../core/models';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';

@Component({
  selector: 'app-answer-card',
  imports: [DurationPipe],
  templateUrl: './answer-card.component.html',
  styleUrl: './answer-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnswerCardComponent {
  readonly response = input.required<QueryResponse>();
}
