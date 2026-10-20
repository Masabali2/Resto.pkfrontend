
import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer
} from '@angular/core';
import {
  provideHttpClient,
  withFetch,
  withInterceptors
} from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import { routes } from './app.routes';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { tenantInterceptor } from './core/interceptors/tenant.interceptor';
import { AuthStateService } from './core/services/auth-state.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        credentialsInterceptor,
        tenantInterceptor,
        errorInterceptor
      ])
    ),
    provideAppInitializer(() => {
      const authState = inject(AuthStateService);
      return authState.initializeSession();
    })
  ]
};
