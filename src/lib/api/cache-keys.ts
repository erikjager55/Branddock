// ─── TTL Constants (milliseconds) ────────────────────────────
export const CACHE_TTL = {
  /** Static reference data: enums, categories, providers (5 min) */
  STATIC: 5 * 60 * 1000,
  /** Module overview lists (30s) */
  OVERVIEW: 30 * 1000,
  /** Detail pages (60s) */
  DETAIL: 60 * 1000,
  /** Dashboard stats & widgets (60s) */
  DASHBOARD: 60 * 1000,
} as const;

// ─── TanStack Query gcTime Constants (milliseconds) ──────────
export const GC_TIME = {
  /** Static reference data: 30 minutes */
  STATIC: 30 * 60 * 1000,
  /** Detail / dashboard: 10 minutes */
  DETAIL: 10 * 60 * 1000,
} as const;

// ─── Server-side Cache Key Generators ────────────────────────
export const cacheKeys = {
  // Static keys (identical for all workspaces)
  static: {
    resourceTypes: 'static:resource-types',
    resourceCategories: 'static:resource-categories',
    insightCategories: 'static:insight-categories',
    insightProviders: 'static:insight-providers',
    quickActions: 'static:quick-actions',
  },

  // Dashboard (workspace-scoped)
  dashboard: {
    stats: (wsId: string) => `dashboard:${wsId}:stats`,
    readiness: (wsId: string) => `dashboard:${wsId}:readiness`,
    attention: (wsId: string) => `dashboard:${wsId}:attention`,
    recommended: (wsId: string) => `dashboard:${wsId}:recommended`,
  },

  // Module lists (workspace-scoped)
  personas: {
    list: (wsId: string) => `personas:${wsId}:list`,
  },
  products: {
    list: (wsId: string) => `products:${wsId}:list`,
  },
  insights: {
    list: (wsId: string) => `insights:${wsId}:list`,
  },
  knowledgeResources: {
    list: (wsId: string) => `knowledge-resources:${wsId}:list`,
  },
  alignment: {
    issues: (wsId: string) => `alignment:${wsId}:issues`,
  },
  notifications: {
    list: (wsId: string, userId: string) => `notifications:${wsId}:${userId}:list`,
  },

  // Invalidation prefixes
  prefixes: {
    dashboard: (wsId: string) => `dashboard:${wsId}`,
    personas: (wsId: string) => `personas:${wsId}`,
    products: (wsId: string) => `products:${wsId}`,
    insights: (wsId: string) => `insights:${wsId}`,
    knowledgeResources: (wsId: string) => `knowledge-resources:${wsId}`,
    alignment: (wsId: string) => `alignment:${wsId}`,
    notifications: (wsId: string) => `notifications:${wsId}`,
    allDashboards: 'dashboard:',
    allStatic: 'static:',
  },
} as const;
