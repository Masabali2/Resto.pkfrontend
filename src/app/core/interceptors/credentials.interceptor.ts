
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const credentialsInterceptor: HttpInterceptorFn = (request, next) => {
  const isApiRequest = request.url.startsWith(environment.apiUrl);

  if (!isApiRequest) {
    return next(request);
  }

  return next(
    request.clone({
      withCredentials: true
    })
  );
};
