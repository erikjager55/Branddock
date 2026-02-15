// =============================================================
// ResearchPlan + PurchasedBundle — DB model + API contracts
// =============================================================

export interface ResearchPlanWithMeta {
  id: string;
  method: string;
  entryMode: string;
  status: string;
  unlockedMethods: string[];
  unlockedAssets: string[];
  rationale: Record<string, string> | null;
  configuration: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchPlanListResponse {
  plans: ResearchPlanWithMeta[];
  stats: {
    total: number;
    active: number;
    completed: number;
  };
}

export interface CreateResearchPlanBody {
  method: string;
  entryMode?: string;
  unlockedMethods?: string[];
  unlockedAssets?: string[];
  rationale?: Record<string, string>;
  configuration?: unknown;
}

export interface UpdateResearchPlanBody {
  method?: string;
  entryMode?: string;
  status?: string;
  unlockedMethods?: string[];
  unlockedAssets?: string[];
  rationale?: Record<string, string>;
  configuration?: unknown;
}

// --- Purchased Bundles ---

export interface PurchasedBundleWithMeta {
  id: string;
  bundleId: string;
  unlockedTools: string[];
  purchasedAt: string;
}

export interface PurchasedBundleListResponse {
  bundles: PurchasedBundleWithMeta[];
  unlockedTools: string[]; // all unique tool IDs across bundles
}

export interface PurchaseBundleBody {
  bundleId: string;
  unlockedTools?: string[];
}
