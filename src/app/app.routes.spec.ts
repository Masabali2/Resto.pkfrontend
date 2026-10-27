import { routes } from './app.routes';

/**
 * Guards the routes that the subscription journey depends on.
 *
 * The plan-selection experience must be reachable by URL, because the shared
 * dialog and the dashboard both navigate to it.
 */
describe('app routes', () => {
  const authenticatedLayout = routes.find(route => route.children);

  it('registers the subscription page inside the authenticated layout', () => {
    expect(authenticatedLayout).toBeTruthy();

    const subscription = authenticatedLayout?.children?.find(
      route => route.path === 'subscription'
    );

    expect(subscription).toBeTruthy();
    expect(subscription?.title).toBe('Subscription — Resto.pk');
  });

  it('lazily loads the subscription page component', () => {
    const subscription = authenticatedLayout?.children?.find(
      route => route.path === 'subscription'
    );

    expect(typeof subscription?.loadComponent).toBe('function');
  });

  it('keeps the restaurant setup route reachable', () => {
    const restaurantSetup = authenticatedLayout?.children?.find(
      route => route.path === 'setup/restaurant'
    );

    expect(restaurantSetup).toBeTruthy();
  });
});

describe('template catalogue routes', () => {
  const authenticatedLayout = routes.find(route => route.children);

  it('registers the catalogue inside the authenticated layout under Website.View', () => {
    const catalogue = authenticatedLayout?.children?.find(route => route.path === 'templates');

    expect(catalogue).toBeTruthy();
    expect(catalogue?.title).toBe('Templates — Resto.pk');
    expect(catalogue?.data).toEqual({ permission: 'Website.View' });
    expect(typeof catalogue?.loadComponent).toBe('function');
  });

  it('registers the dedicated preview as a single public top-level route', () => {
    const previewRoutes = routes.filter(route => route.path === 'templates/:id/preview');

    expect(previewRoutes).toHaveLength(1);
    expect(previewRoutes[0].title).toBe('Template Preview — Resto.pk');
    expect(previewRoutes[0].redirectTo).toBeUndefined();
    expect(previewRoutes[0].canActivate).toBeUndefined();
    expect(typeof previewRoutes[0].loadComponent).toBe('function');

    // The authenticated layout must not keep a second, guarded preview route.
    const templates = authenticatedLayout?.children?.find(route => route.path === 'templates');
    const nestedPreview = templates?.children?.find(route => route.path === ':id/preview');

    expect(nestedPreview).toBeUndefined();
  });
});
