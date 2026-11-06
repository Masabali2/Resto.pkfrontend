import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AntiforgeryService } from '../services/antiforgery.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isPublicMutation(url: string, method: string): boolean {
  return MUTATING_METHODS.has(method) && url.startsWith(environment.apiUrl + '/v1/public/');
}

export const publicAntiforgeryInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isPublicMutation(request.url, request.method)) return next(request);

  const antiforgery = inject(AntiforgeryService);

  const send = (token: string) =>
    next(request.clone({
      setHeaders: { 'X-XSRF-TOKEN': token },
      credentials: 'include'
    }));

  return antiforgery.getToken().pipe(
    switchMap(token =>
      send(token).pipe(
        catchError((error: unknown) => {
          if (!(error instanceof HttpErrorResponse) || error.status !== 400) {
            return throwError(() => error);
          }

          antiforgery.invalidate();
          return antiforgery.getToken(true).pipe(switchMap(send));
        })
      )
    )
  );
};
