import { HttpClient, HttpContext, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ApiError } from '../models';
import { NotificationService } from '../services/notification.service';
import { SKIP_ERROR_TOAST } from '../tokens/http-context.tokens';
import { httpErrorInterceptor, toApiError } from './http-error.interceptor';

describe('httpErrorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(() => {
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['error', 'success', 'info']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('maps FastAPI {detail} errors and shows a toast', () => {
    let error: ApiError | undefined;
    http.get('/api/x').subscribe({ error: (e: ApiError) => (error = e) });

    controller.expectOne('/api/x').flush({ detail: 'No API key configured' }, { status: 400, statusText: 'Bad Request' });

    expect(error).toEqual({ status: 400, message: 'No API key configured' });
    expect(notifications.error).toHaveBeenCalledWith('No API key configured');
  });

  it('explains network failures', () => {
    let error: ApiError | undefined;
    http.get('/api/x').subscribe({ error: (e: ApiError) => (error = e) });

    controller.expectOne('/api/x').error(new ProgressEvent('error'), { status: 0 });

    expect(error?.status).toBe(0);
    expect(error?.message).toContain('Cannot reach the API server');
  });

  it('skips the toast when SKIP_ERROR_TOAST is set', () => {
    http.get('/api/health', { context: new HttpContext().set(SKIP_ERROR_TOAST, true) }).subscribe({ error: () => {} });

    controller.expectOne('/api/health').flush(null, { status: 500, statusText: 'Server Error' });

    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('passes successful responses through untouched', () => {
    let body: unknown;
    http.get('/api/ok').subscribe((b) => (body = b));
    controller.expectOne('/api/ok').flush({ fine: true });
    expect(body).toEqual({ fine: true });
    expect(notifications.error).not.toHaveBeenCalled();
  });
});

describe('toApiError', () => {
  it('joins FastAPI validation errors', () => {
    const err = new HttpErrorResponse({
      status: 422,
      error: { detail: [{ loc: ['body', 'question'], msg: 'String should have at least 3 characters' }] },
    });
    expect(toApiError(err)).toEqual({ status: 422, message: 'question: String should have at least 3 characters' });
  });

  it('handles plain Error and unknown values', () => {
    expect(toApiError(new Error('bad'))).toEqual({ status: -1, message: 'bad' });
    expect(toApiError('???').message).toBe('Unexpected error.');
  });
});
