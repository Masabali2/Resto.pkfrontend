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
      import('./shared/layouts/dashboard-layout/dashboard-layout').then(
        m => m.DashboardLayout
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Dashboard — Resto.pk',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-overview/dashboard-overview').then(
            m => m.DashboardOverview
          )
      }
    ]
  },
  {
    path: 'setup/restaurant',
    canActivate: [authGuard],
    title: 'Set Up Restaurant — Resto.pk',
    loadComponent: () =>
      import('./features/onboarding/pages/restaurant-setup/restaurant-setup').then(
        m => m.RestaurantSetup
      )
  },
  {
    path: 'websites',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Websites — Resto.pk',
        loadComponent: () =>
          import('./features/websites/pages/website-list/website-list').then(
            m => m.WebsiteList
          )
      },
      {
        path: 'new',
        title: 'Create Website — Resto.pk',
        loadComponent: () =>
          import('./features/websites/pages/create-website/create-website').then(
            m => m.CreateWebsite
          )
      },
      {
        path: ':id',
        title: 'Website — Resto.pk',
        loadComponent: () =>
          import('./features/websites/pages/website-detail/website-detail').then(
            m => m.WebsiteDetail
          )
      },
      {
        path: ':id/editor',
        title: 'Website Editor — Resto.pk',
        loadComponent: () =>
          import('./features/websites/pages/website-editor/website-editor').then(
            m => m.WebsiteEditor
          )
      }
    ]
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
