import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Central HTTP error interceptor.
 *
 * It does not display notifications itself: every failed response is
 * re-thrown so the calling feature can route it through
 * HttpErrorHandlerService, which owns message extraction (preferring
 * backend messages) and presentation. Keeping notification ownership in
 * a single layer guarantees at most one error toast per failed request.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((error: unknown) => throwError(() => error))
  );
