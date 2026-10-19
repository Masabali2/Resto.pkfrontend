import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then(
        m => m.Login
      )
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/register/register').then(
        m => m.Register
      )
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./features/auth/pages/verify-email/verify-email').then(
        m => m.VerifyEmail
      )
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password').then(
        m => m.ForgotPassword
      )
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password').then(
        m => m.ResetPassword
      )
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/pages/under-construction/under-construction').then(
        m => m.UnderConstruction
      )
   },
//   {
//     path: 'platform/dashboard',
//     canActivate: [authGuard],
//     redirectTo: 'dashboard'
//   },
//   {
//     path: 'tenant/dashboard',
//     canActivate: [authGuard],
//     redirectTo: 'dashboard'
//   },
//   {
//     path: 'manager/dashboard',
//     canActivate: [authGuard],
//     redirectTo: 'dashboard'
//   },
//   {
//     path: 'staff/dashboard',
//     canActivate: [authGuard],
//     redirectTo: 'dashboard'
//   },
  {
    path: '',
    loadComponent: () =>
      import('./features/public-website/pages/home/home').then(
        m => m.PublicHome
      ),
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
