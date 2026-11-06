import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { ProviderInfo, ProviderName, QueryRequest } from '../../../../core/models';

const PROVIDER_LABELS: Record<ProviderName, string> = { openai: 'OpenAI', groq: 'Groq' };

@Component({
  selector: 'app-query-input',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './query-input.component.html',
  styleUrl: './query-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueryInputComponent {
  readonly providers = input<ProviderInfo[]>([]);
  readonly defaultProvider = input<ProviderName | null>(null);
  readonly loading = input(false);
  readonly examples = input<readonly string[]>([]);
  readonly initialQuestion = input('');

  readonly submitted = output<QueryRequest>();

  readonly providerLabels = PROVIDER_LABELS;

  readonly form = new FormGroup({
    question: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(1000)],
    }),
    provider: new FormControl<ProviderName | null>(null),
    maxRetries: new FormControl(3, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(10)],
    }),
  });

  constructor() {
    effect(() => {
      const provider = this.defaultProvider();
      if (provider && !this.form.controls.provider.value) {
        this.form.controls.provider.setValue(provider);
      }
    });
    effect(() => {
      const question = this.initialQuestion();
      if (question) {
        this.form.controls.question.setValue(question);
      }
    });
  }

  get questionError(): string | null {
    const control = this.form.controls.question;
    if (!control.touched || control.valid) return null;
    if (control.hasError('required')) return 'Type a question first.';
    if (control.hasError('minlength')) return 'That question is too short to turn into SQL.';
    if (control.hasError('maxlength')) return 'Keep the question under 1,000 characters.';
    return null;
  }

  submit(): void {
    if (this.loading()) {
      return;
    }
    const question = this.form.controls.question.value.trim();
    this.form.controls.question.setValue(question);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { provider, maxRetries } = this.form.getRawValue();
    this.submitted.emit({ question, provider, max_retries: maxRetries });
  }

  useExample(question: string): void {
    this.form.controls.question.setValue(question);
    this.submit();
  }

  clear(): void {
    this.form.controls.question.reset('');
  }
}
