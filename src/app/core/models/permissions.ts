
export const PERMISSIONS = {
  Menu: {
    View: 'Menu.View',
    Create: 'Menu.Create',
    Update: 'Menu.Update',
    Delete: 'Menu.Delete'
  } as const,
  MenuCategory: {
    View: 'MenuCategory.View',
    Create: 'MenuCategory.Create',
    Update: 'MenuCategory.Update',
    Delete: 'MenuCategory.Delete'
  } as const,
  MenuItem: {
    View: 'MenuItem.View',
    Create: 'MenuItem.Create',
    Update: 'MenuItem.Update',
    Delete: 'MenuItem.Delete'
  } as const,
  Website: {
    View: 'Website.View',
    Update: 'Website.Update',
    Publish: 'Website.Publish'
  } as const
} as const;

export type MenuPermission = typeof PERMISSIONS.Menu[keyof typeof PERMISSIONS.Menu];
export type MenuCategoryPermission = typeof PERMISSIONS.MenuCategory[keyof typeof PERMISSIONS.MenuCategory];
export type MenuItemPermission = typeof PERMISSIONS.MenuItem[keyof typeof PERMISSIONS.MenuItem];
