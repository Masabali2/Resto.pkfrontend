export type SidebarNavStatus = 'available' | 'planned';

export interface SidebarNavItem {
  label: string;
  icon: string;
  status: SidebarNavStatus;
  route?: readonly string[];
  exactMatch?: boolean;
  setupRoute?: readonly string[];
  requiredPermissions?: readonly string[];
  permissionMode?: 'all' | 'any';
}

export interface SidebarNavGroup {
  heading: string;
  items: readonly SidebarNavItem[];
}

/**
 * Navigation catalogue. `route` points only at verified routes from
 * app.routes.ts; planned features without a page render as disabled entries.
 * `setupRoute` links a planned item to an existing entry point (the
 * restaurant onboarding journey), following the treatment established by
 * DashboardSidebar. Permission identifiers come from the backend catalog
 * already used by the repository (Menu.*, Order.*, Staff.*, Website.*,
 * Restaurant.*). Sidebar visibility is a UX concern — the backend remains
 * the security authority.
 */
export const SIDEBAR_NAVIGATION: readonly SidebarNavGroup[] = [
  {
    heading: 'Overview',
    items: [
      {
        label: 'Dashboard',
        icon: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z',
        status: 'available',
        route: ['/dashboard'],
        exactMatch: true
      }
    ]
  },
  {
    heading: 'Restaurant Management',
    items: [
      {
        label: 'Restaurants & Branches',
        icon: 'M12 3 3 8v13h6v-6h6v6h6V8l-9-5Z',
        status: 'planned',
        setupRoute: ['/setup/restaurant'],
        requiredPermissions: ['Restaurant.View']
      },
      {
        label: 'Menu Management',
        icon: 'M8 3v8a2 2 0 0 0 4 0V3M10 11v10M17 3c-1.7 1.2-2.5 3.4-2.5 6 0 1.7.8 2.8 2.5 3v9',
        status: 'available',
        route: ['/menus'],
        requiredPermissions: ['Menu.View']
      },
      {
        label: 'Orders',
        icon: 'M7 8h14l-1.2 12.2a1 1 0 0 1-1 .8H9.2a1 1 0 0 1-1-.8L7 8Zm3 0a4 4 0 1 1 8 0',
        status: 'planned',
        requiredPermissions: ['Order.View']
      },
      {
        label: 'Staff & Members',
        icon: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M17 4a3 3 0 1 1 0 6m1 10a5.5 5.5 0 0 0-3-4.9',
        status: 'planned',
        requiredPermissions: ['Staff.View']
      }
    ]
  },
  {
    heading: 'Website Builder',
    items: [
      {
        label: 'Templates',
        icon: 'M4 4h7v7H4V4Zm9 0h7v4h-7V4Zm0 6h7v10h-7V10ZM4 13h7v7H4v-7Z',
        status: 'planned'
      },
      {
        label: 'Website Editor',
        icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2c1.6 0 3 2.7 3 6s-1.4 6-3 6-3-2.7-3-6 1.4-6 3-6ZM5 9h14M5 15h14',
        status: 'available',
        route: ['/websites'],
        requiredPermissions: ['Website.View']
      },
      {
        label: 'Branding & Assets',
        icon: 'M12 3a9 9 0 1 0 0 18c1 0 1.7-.8 1.7-1.7 0-.5-.2-.8-.5-1.2-.2-.3-.4-.6-.4-1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4.4-4-8.5-9-8.5Zm-5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
        status: 'planned'
      },
      {
        label: 'Publish Website',
        icon: 'M12 16V5m0 0-5 5m5-5 5 5M4 20h16',
        status: 'planned'
      },
      {
        label: 'QR Menu',
        icon: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm13 0h3m-3 4h3m-6-4h2v2h-2v-2Zm0 4h2v2h-2v-2Z',
        status: 'planned'
      }
    ]
  },
  {
    heading: 'Insights & Activity',
    items: [
      {
        label: 'Analytics',
        icon: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
        status: 'planned'
      },
      {
        label: 'Activity',
        icon: 'M3 12h4l2.5-7 5 14L17 12h4',
        status: 'planned'
      },
      {
        label: 'Setup Checklist',
        icon: 'M4 6h2v2H4V6Zm4 0h12v2H8V6Zm-4 5h2v2H4v-2Zm4 0h12v2H8v-2Zm-4 5h2v2H4v-2Zm4 0h12v2H8v-2Z',
        status: 'planned'
      }
    ]
  },
  {
    heading: 'Account & Support',
    items: [
      {
        label: 'Subscription & Billing',
        icon: 'M3 7h18v13H3V7Zm0 4h18M7 4h10',
        status: 'available',
        route: ['/subscription']
      },
      {
        label: 'Settings',
        icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3h-1.5a6.5 6.5 0 0 0-.6-2l1.3-.9-1.3-2.3-1.3.9a6.5 6.5 0 0 0-1.6-1V3h-3v1.7a6.5 6.5 0 0 0-1.6 1L6.6 4.8 5.3 7.1l1.3.9a6.5 6.5 0 0 0-.6 2H4.5',
        status: 'planned'
      },
      {
        label: 'Help & Support',
        icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-.5 13.5h1v1h-1v-1Zm-2-5.2c.2-1.6 1.4-2.6 2.7-2.6 1.5 0 2.6 1 2.6 2.4 0 1.5-1.1 2-1.9 2.7-.4.4-.6.8-.6 1.4h-1.2c0-1 .3-1.6 1-2.2.7-.6 1.4-1.1 1.4-1.9 0-.8-.6-1.3-1.3-1.3-.8 0-1.4.5-1.5 1.5h-1.2Z',
        status: 'planned'
      }
    ]
  }
];
