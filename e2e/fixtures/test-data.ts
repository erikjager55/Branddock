/**
 * Test data constants — references to seed data in prisma/seed.ts.
 * Keep in sync with seed IDs.
 */

export const TEST_USERS = {
  owner: {
    email: 'erik@branddock.com',
    password: 'Password123!',
    name: 'Erik Jager',
    id: 'demo-user-erik-001',
  },
  member: {
    email: 'sarah@branddock.com',
    password: 'Password123!',
    name: 'Sarah Chen',
  },
  directOwner: {
    email: 'john@techcorp.com',
    password: 'Password123!',
    name: 'John Smith',
  },
} as const;

export const TEST_ORG = {
  id: 'demo-org-branddock-001',
  name: 'Branddock Agency',
} as const;

export const TEST_WORKSPACE = {
  id: 'demo-workspace-branddock-001',
  name: 'Branddock Demo',
  slug: 'branddock-demo',
} as const;

/** Section IDs used for sidebar navigation */
export const SECTIONS = {
  dashboard: 'dashboard',
  brand: 'brand',
  brandstyle: 'brandstyle',
  personas: 'personas',
  products: 'products',
  trends: 'trends',
  knowledge: 'knowledge',
  research: 'research',
  activeCampaigns: 'active-campaigns',
  brandAlignment: 'brand-alignment',
  businessStrategy: 'business-strategy',
  settingsAccount: 'settings-account',
  settingsTeam: 'settings-team',
  settingsBilling: 'settings-billing',
} as const;
