import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  UrlTree
} from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';
import { AuthorizationService } from '../services/authorization.service';

export interface PermissionGuardData {
  permission?: string;
  permissions?: readonly string[];
  mode?: 'all' | 'any';
}

function buildRequiredPermissions(
  data: PermissionGuardData
): readonly string[] | null {
  if (typeof data.permission === 'string' && data.permission.length > 0) {
    return [data.permission];
  }

  if (Array.isArray(data.permissions) && data.permissions.length > 0) {
    return data.permissions;
  }

  return null;
}

export const permissionGuard: CanActivateFn = (_route, _state) => {
  const router = inject(Router);
  const authState = inject(AuthStateService);
  const authorization = inject(AuthorizationService);

  if (!authState.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const data = _route.data as PermissionGuardData;
  const required = buildRequiredPermissions(data);

  if (required === null) {
    return router.createUrlTree(['/dashboard']);
  }

  const mode = data.mode ?? 'all';

  if (!authorization.hasPermissions(required, mode)) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
