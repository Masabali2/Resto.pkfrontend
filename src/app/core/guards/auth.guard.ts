
import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthStateService } from '../services/auth-state.service';

export const authGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  return toObservable(authState.isInitialized).pipe(
    filter(initialized => initialized),
    take(1),
    map(() =>
      authState.isAuthenticated()
        ? true
        : router.createUrlTree(['/login'])
    )
  );
};
