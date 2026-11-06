import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { ApiError } from '../models';
import { NotificationService } from '../services/notification.service';
import { SKIP_ERROR_TOAST } from '../tokens/http-context.tokens';

interface ValidationDetail {
  msg?: string;
  loc?: (string | number)[];
}

/** Converts any HTTP failure into an ApiError with a human-friendly message. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return {
        status: 0,
        message: 'Cannot reach the API server. Is the backend running on port 8000?',
      };
    }
    const detail: unknown = error.error?.detail;
    if (typeof detail === 'string') {
      return { status: error.status, message: detail };
    }
    if (Array.isArray(detail)) {
      const message = (detail as ValidationDetail[])
        .map((d) => {
          const field = d.loc?.[d.loc.length - 1];
          return field ? `${field}: ${d.msg}` : d.msg;
        })
        .filter(Boolean)
        .join('; ');
      return { status: error.status, message: message || 'Invalid request.' };
    }
    return { status: error.status, message: error.message || 'Unexpected server error.' };
  }
  if (error instanceof Error) {
    return { status: -1, message: error.message };
  }
  return { status: -1, message: 'Unexpected error.' };
}

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);
  return next(req).pipe(
    catchError((err: unknown) => {
      const apiError = toApiError(err);
      if (!req.context.get(SKIP_ERROR_TOAST)) {
        notifications.error(apiError.message);
      }
      return throwError(() => apiError);
    }),
  );
};
