import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Resto.pk — Restaurant Website Builder',
    loadComponent: () =>
      import('./features/public-website/pages/home/home').then(
        m => m.PublicHome
      )
  },
  {
    path: 'login',
    title: 'Login — Resto.pk',
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
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/shared-layout/shared-layout').then(
        m => m.SharedLayout
      ),
    children: [
      {
        path: 'dashboard',
        pathMatch: 'full',
        title: 'Dashboard — Resto.pk',
        loadComponent: () =>
          import('./features/dashboard/page/dashboard/dashboard').then(
            m => m.Dashboard
          )
      },
      {
        path: 'setup/workspace',
        title: 'Create Workspace — Resto.pk',
        loadComponent: () =>
          import('./features/onboarding/pages/workspace-setup/workspace-setup').then(
            m => m.WorkspaceSetup
          )
      },
      {
        path: 'setup/restaurant',
        title: 'Set Up Restaurant — Resto.pk',
        loadComponent: () =>
          import('./features/onboarding/pages/restaurant-setup/restaurant-setup').then(
            m => m.RestaurantSetup
          )
      },
      {
        path: 'subscription',
        title: 'Subscription — Resto.pk',
        loadComponent: () =>
          import('./features/subscription/pages/subscription-page/subscription-page').then(
            m => m.SubscriptionPage
          )
      },
      {
        path: 'websites',
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Websites — Resto.pk',
            canActivate: [permissionGuard],
            data: { permission: 'Website.View' },
            loadComponent: () =>
              import('./features/websites/pages/website-list/website-list').then(
                m => m.WebsiteList
              )
          },
          {
            path: 'new',
            title: 'Create Website — Resto.pk',
            canActivate: [permissionGuard],
            data: { permissions: ['Website.View', 'Website.Update'], mode: 'any' },
            loadComponent: () =>
              import('./features/websites/pages/create-website/create-website').then(
                m => m.CreateWebsite
              )
          },
          {
            path: ':id',
            title: 'Website — Resto.pk',
            canActivate: [permissionGuard],
            data: { permission: 'Website.View' },
            loadComponent: () =>
              import('./features/websites/pages/website-detail/website-detail').then(
                m => m.WebsiteDetail
              )
          },
          {
            path: ':id/editor',
            title: 'Website Editor — Resto.pk',
            canActivate: [permissionGuard],
            data: { permission: 'Website.Update' },
            loadComponent: () =>
              import('./features/websites/pages/website-editor/website-editor').then(
                m => m.WebsiteEditor
              )
          }
        ]
      },
      {
        path: 'menus',
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Menus — Resto.pk',
            canActivate: [permissionGuard],
            data: { permission: 'Menu.View' },
            loadComponent: () =>
              import('./features/menu/pages/menu-list/menu-list').then(
                m => m.MenuList
              )
          },
          {
            path: 'new',
            title: 'Create Menu — Resto.pk',
            canActivate: [permissionGuard],
            canDeactivate: [unsavedChangesGuard],
            data: { permission: 'Menu.Create' },
            loadComponent: () =>
              import('./features/menu/pages/menu-form/menu-form').then(
                m => m.MenuForm
              )
          },
          {
            path: ':menuId/edit',
            title: 'Edit Menu — Resto.pk',
            canActivate: [permissionGuard],
            canDeactivate: [unsavedChangesGuard],
            data: { permission: 'Menu.Update' },
            loadComponent: () =>
              import('./features/menu/pages/menu-form/menu-form').then(
                m => m.MenuForm
              )
          },
          {
            path: ':menuId',
            title: 'Menu — Resto.pk',
            canActivate: [permissionGuard],
            data: { permission: 'Menu.View' },
            loadComponent: () =>
              import('./features/menu/pages/menu-detail/menu-detail').then(
                m => m.MenuDetail
              )
          },
          {
            path: ':menuId/categories/new',
            title: 'Create Category — Resto.pk',
            canActivate: [permissionGuard],
            canDeactivate: [unsavedChangesGuard],
            data: { permission: 'MenuCategory.Create' },
            loadComponent: () =>
              import('./features/menu/pages/menu-category-form/menu-category-form').then(
                m => m.MenuCategoryForm
              )
          },
          {
            path: ':menuId/categories/:categoryId/edit',
            title: 'Edit Category — Resto.pk',
            canActivate: [permissionGuard],
            canDeactivate: [unsavedChangesGuard],
            data: { permission: 'MenuCategory.Update' },
            loadComponent: () =>
              import('./features/menu/pages/menu-category-form/menu-category-form').then(
                m => m.MenuCategoryForm
              )
          },
          {
            path: ':menuId/categories/:menuId/items/new',
            title: 'Create Item — Resto.pk',
            canActivate: [permissionGuard],
            canDeactivate: [unsavedChangesGuard],
            data: { permission: 'MenuItem.Create' },
            loadComponent: () =>
              import('./features/menu/pages/menu-item-form/menu-item-form').then(
                m => m.MenuItemForm
              )
          },
          {
            path: ':menuId/categories/:categoryId/items/:itemId/edit',
            title: 'Edit Item — Resto.pk',
            canActivate: [permissionGuard],
            canDeactivate: [unsavedChangesGuard],
            data: { permission: 'MenuItem.Update' },
            loadComponent: () =>
              import('./features/menu/pages/menu-item-form/menu-item-form').then(
                m => m.MenuItemForm
              )
          }
        ]
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];