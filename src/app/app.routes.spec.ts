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
    const templates = authenticatedLayout?.children?.find(route => route.path === 'templates');
    const catalogue = templates?.children?.find(
      route => route.path === '' && route.pathMatch === 'full'
    );

    expect(catalogue).toBeTruthy();
    expect(catalogue?.title).toBe('Templates — Resto.pk');
    expect(catalogue?.data).toEqual({ permission: 'Website.View' });
    expect(typeof catalogue?.loadComponent).toBe('function');
  });

  it('keeps the intended preview path present so previews do not dead-end', () => {
    const templates = authenticatedLayout?.children?.find(route => route.path === 'templates');
    const preview = templates?.children?.find(route => route.path === ':id/preview');

    expect(preview).toBeTruthy();
    // The dedicated TemplatePreview page is registered lazily (Task 2); no
    // redirect placeholder remains, so previews resolve to a real component.
    expect(preview?.redirectTo).toBeUndefined();
    expect(typeof preview?.loadComponent).toBe('function');
    expect(preview?.data).toEqual({ permission: 'Website.View' });
  });
});
