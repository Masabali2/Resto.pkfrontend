import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthStateService } from '../services/auth-state.service';

export const tenantInterceptor: HttpInterceptorFn = (request, next) => {
  const authState = inject(AuthStateService);
  const tenantId = authState.authResult()?.activeTenant?.tenantId;

  if (!tenantId || request.context?.skipTenantHeader === true) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        'X-Tenant-Id': tenantId
      }
    })
  );
};
