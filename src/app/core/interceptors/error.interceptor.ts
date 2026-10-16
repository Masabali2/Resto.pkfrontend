
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const notifications = inject(NotificationService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 0) {
          notifications.error(
            'Unable to connect to the server. Check your connection and try again.'
          );
        } else if (error.status >= 500) {
          notifications.error(
            'A server error occurred. Please try again later.'
          );
        }
      }

      return throwError(() => error);
    })
  );
};
