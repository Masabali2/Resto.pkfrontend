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
