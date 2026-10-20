export type DashboardNavStatus = 'available' | 'planned';

export interface DashboardNavItem {
  label: string;
  icon: string;
  status: DashboardNavStatus;
  route?: string[];
}

export interface DashboardNavGroup {
  heading: string;
  items: DashboardNavItem[];
}

/**
 * Provisional navigation catalogue. Only entries with a `route` point at
 * verified existing routes; `planned` items render as disabled placeholders
 * until their modules ship. Permission-aware filtering will replace this
 * static list in a later stage — it enforces no authorization here.
 */
export const DASHBOARD_NAVIGATION: readonly DashboardNavGroup[] = [
  {
    heading: 'Workspace',
    items: [
      {
        label: 'Overview',
        icon: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z',
        status: 'available',
        route: ['/dashboard'],
      },
      {
        label: 'Restaurants',
        icon: 'M12 3 3 8v13h6v-6h6v6h6V8l-9-5Z',
        status: 'planned'
      }
    ]
  },
  {
    heading: 'Website',
    items: [
      {
        label: 'My Websites',
        icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2c1.6 0 3 2.7 3 6s-1.4 6-3 6-3-2.7-3-6 1.4-6 3-6ZM5 9h14M5 15h14',
        status: 'available',
        route: ['/websites']
      },
      {
        label: 'Templates',
        icon: 'M4 4h7v7H4V4Zm9 0h7v4h-7V4Zm0 6h7v10h-7V10ZM4 13h7v7H4v-7Z',
        status: 'planned'
      }
    ]
  },
  {
    heading: 'Operations',
    items: [
      {
        label: 'Menu',
        icon: 'M8 3v8a2 2 0 0 0 4 0V3M10 11v10M17 3c-1.7 1.2-2.5 3.4-2.5 6 0 1.7.8 2.8 2.5 3v9',
        status: 'planned'
      },
      {
        label: 'Orders',
        icon: 'M7 8h14l-1.2 12.2a1 1 0 0 1-1 .8H9.2a1 1 0 0 1-1-.8L7 8Zm3 0a4 4 0 1 1 8 0',
        status: 'planned'
      }
    ]
  },
  {
    heading: 'Team',
    items: [
      {
        label: 'Staff & Members',
        icon: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M17 4a3 3 0 1 1 0 6m1 10a5.5 5.5 0 0 0-3-4.9',
        status: 'planned'
      }
    ]
  },
  {
    heading: 'Appearance',
    items: [
      {
        label: 'Branding & Assets',
        icon: 'M12 3a9 9 0 1 0 0 18c1 0 1.7-.8 1.7-1.7 0-.5-.2-.8-.5-1.2-.2-.3-.4-.6-.4-1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4.4-4-8.5-9-8.5Zm-5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
        status: 'planned'
      }
    ]
  },
  {
    heading: 'Insights',
    items: [
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
    heading: 'Account',
    items: [
      {
        label: 'Settings',
        icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-1.6.9-.7c.1-.1.2-.2.2-.4v-.6c0-.2-.1-.3-.2-.4l-.9-.7c-.2-.1-.2-.3-.2-.5l.4-1.1c0-.2 0-.3-.1-.5l-.5-.9c-.1-.1-.2-.2-.4-.2h-1.1c-.2 0-.4-.1-.5-.2l-.7-.9C16.8 3 16.7 3 16.5 3h-1.1c-.2 0-.3.1-.4.2l-.7.9m-6.6 0-.7-.9c-.1-.1-.2-.2-.4-.2H5.5c-.2 0-.3.1-.4.2l-.7.9c-.1.1-.3.2-.5.2H2.8c-.2 0-.3.1-.4.2l-.5.9c-.1.1-.1.3 0 .5l.4 1.1c0 .2 0 .4-.2.5l-.9.7c-.1.1-.2.2-.2.4v.6c0 .2.1.3.2.4l.9.7c.2.1.2.3.2.5l-.4 1.1c0-.2 0 .3.1.5l.5.9c.1.1.2.2.4.2h1.1c.2 0 .4.1.5.2l.7.9c.1.1.2.2.4.2h1.1c.2 0 .3-.1.4-.2l.7-.9c.1-.1.3-.2.5-.2h1.1c.2 0 .3-.1.4-.2l.5-.9c.1-.1.1-.3 0-.5l-.4-1.1c0-.2 0-.4.2-.5Z',
        status: 'planned'
      }
    ]
  }
];
