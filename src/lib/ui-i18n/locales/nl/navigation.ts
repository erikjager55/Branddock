// Dutch UI strings — `navigation` namespace. Hand-seeded for Fase 1.
const navigation = {
  settings: {
    account: 'Account',
    team: 'Team',
    workspaces: 'Workspaces',
    billing: 'Facturering',
    notifications: 'Notificaties',
    appearance: 'Weergave',
    integrations: 'Integraties',
    brandRules: 'Merkregels',
    validation: 'Validatie',
  },
  topnav: {
    quickContent: 'Snelle content',
    brandAssistant: 'Brand Assistant',
    search: 'Zoeken',
    notifications: 'Notificaties',
    notificationsUnread: 'Notificaties ({{count}} ongelezen)',
  },
  sidebar: {
    settings: 'Instellingen',
    helpSupport: 'Help & ondersteuning',
  },
} as const;

export default navigation;
