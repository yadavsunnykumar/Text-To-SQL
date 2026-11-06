import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A quiet placeholder that says what is missing and what to do next. */
@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty">
      <h2 class="empty__title">{{ title() }}</h2>
      @if (message()) {
        <p class="empty__message">{{ message() }}</p>
      }
      <div class="empty__actions"><ng-content /></div>
    </div>
  `,
  styles: `
    .empty {
      padding: 40px 0;
      max-width: 56ch;
    }
    .empty__title {
      font-size: 1.125rem;
      margin: 0 0 6px;
    }
    .empty__message {
      color: var(--muted);
      margin: 0 0 16px;
    }
    .empty__actions:empty {
      display: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>('');
}
