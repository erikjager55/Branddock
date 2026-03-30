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
    trendCategories: 'static:trend-categories',
    quickActions: 'static:quick-actions',
  },

  // Dashboard (workspace-scoped)
  dashboard: {
    stats: (wsId: string) => `dashboard:${wsId}:stats`,
    readiness: (wsId: string) => `dashboard:${wsId}:readiness`,
    attention: (wsId: string) => `dashboard:${wsId}:attention`,
    recommended: (wsId: string) => `dashboard:${wsId}:recommended`,
    activity: (wsId: string) => `dashboard:${wsId}:activity`,
    campaignsPreview: (wsId: string) => `dashboard:${wsId}:campaigns-preview`,
  },

  // Module lists (workspace-scoped)
  personas: {
    list: (wsId: string) => `personas:${wsId}:list`,
  },
  products: {
    list: (wsId: string) => `products:${wsId}:list`,
  },
  trendRadar: {
    list: (wsId: string) => `trend-radar:${wsId}:list`,
  },
  knowledgeResources: {
    list: (wsId: string) => `knowledge-resources:${wsId}:list`,
  },
  alignment: {
    issues: (wsId: string) => `alignment:${wsId}:issues`,
  },
  campaigns: {
    list: (wsId: string) => `campaigns:${wsId}:list`,
    detail: (wsId: string, id: string) => `campaigns:${wsId}:detail:${id}`,
  },
  competitors: {
    list: (wsId: string) => `competitors:${wsId}:list`,
    detail: (wsId: string, id: string) => `competitors:${wsId}:detail:${id}`,
  },
  websiteScanner: {
    scan: (wsId: string, scanId: string) => `website-scanner:${wsId}:scan:${scanId}`,
  },
  media: {
    list: (wsId: string) => `media:${wsId}:list`,
    detail: (wsId: string, id: string) => `media:${wsId}:detail:${id}`,
    featured: (wsId: string) => `media:${wsId}:featured`,
    collections: (wsId: string) => `media:${wsId}:collections`,
    tags: (wsId: string) => `media:${wsId}:tags`,
    styleRefs: (wsId: string) => `media:${wsId}:style-refs`,
    brandVoices: (wsId: string) => `media:${wsId}:brand-voices`,
    soundEffects: (wsId: string) => `media:${wsId}:sound-effects`,
    aiImages: (wsId: string) => `media:${wsId}:ai-images`,
    stats: (wsId: string) => `media:${wsId}:stats`,
  },
  notifications: {
    list: (wsId: string, userId: string) => `notifications:${wsId}:${userId}:list`,
  },

  // Invalidation prefixes
  prefixes: {
    dashboard: (wsId: string) => `dashboard:${wsId}`,
    personas: (wsId: string) => `personas:${wsId}`,
    products: (wsId: string) => `products:${wsId}`,
    trendRadar: (wsId: string) => `trend-radar:${wsId}`,
    knowledgeResources: (wsId: string) => `knowledge-resources:${wsId}`,
    alignment: (wsId: string) => `alignment:${wsId}`,
    campaigns: (wsId: string) => `campaigns:${wsId}`,
    competitors: (wsId: string) => `competitors:${wsId}`,
    websiteScanner: (wsId: string) => `website-scanner:${wsId}`,
    media: (wsId: string) => `media:${wsId}`,
    notifications: (wsId: string) => `notifications:${wsId}`,
    allDashboards: 'dashboard:',
    allStatic: 'static:',
  },
} as const;
