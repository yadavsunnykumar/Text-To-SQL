import { Pipe, PipeTransform } from '@angular/core';

/** 850 -> "850 ms", 1234 -> "1.23 s" */
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(ms: number | null | undefined): string {
    if (ms === null || ms === undefined || Number.isNaN(ms)) {
      return '—';
    }
    return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
  }
}
