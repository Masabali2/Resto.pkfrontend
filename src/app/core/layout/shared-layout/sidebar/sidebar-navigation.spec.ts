import { PERMISSIONS } from '../../../models/permissions';
import { SIDEBAR_NAVIGATION } from './sidebar-navigation';

describe('SIDEBAR_NAVIGATION order access', () => {
  it('shows Orders to users with Order.View, independently of update access', () => {
    const orders = SIDEBAR_NAVIGATION
      .flatMap(group => group.items)
      .find(item => item.label === 'Orders');

    expect(orders?.route).toEqual(['/orders']);
    expect(orders?.requiredPermissions).toEqual([PERMISSIONS.Order.View]);
    expect(orders?.requiredPermissions).not.toContain(PERMISSIONS.Order.Update);
  });
});