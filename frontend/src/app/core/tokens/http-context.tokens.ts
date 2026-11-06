import { HttpContextToken } from '@angular/common/http';

/** Set to true on a request to stop the error interceptor from showing a snackbar. */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
