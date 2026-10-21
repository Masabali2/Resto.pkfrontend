import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthStateService } from '../services/auth-state.service';
import { SKIP_TENANT_HEADER } from '../services/tenant-context.service';
import { environment } from '../../../environments/environment';

export const TENANT_HEADER = 'X-Tenant-Id';

export const tenantInterceptor: HttpInterceptorFn = (request, next) => {
  const authState = inject(AuthStateService);

  if (!request.url.startsWith(environment.apiUrl)) {
    return next(request);
  }

  if (request.context?.get(SKIP_TENANT_HEADER) === true ||
      request.headers.has(TENANT_HEADER)) {
    return next(request);
  }

  const tenantId = authState.authResult()?.activeTenant?.tenantId;

  if (!tenantId) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        [TENANT_HEADER]: tenantId
      }
    })
  );
};
