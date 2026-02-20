export interface ResearchStatsResponse {
  activeStudies: number;
  completed: number;
  pendingReview: number;
  totalInsights: number;
}

export interface MethodStatusResponse {
  methods: {
    type: string;
    active: number;
    done: number;
    unlocked: number;
  }[];
}

export interface ActiveResearchItem {
  id: string;
  personaName?: string;
  assetName?: string;
  method: string;
  progress: number;
  lastActivityAt: string;
}

export interface PendingValidationItem {
  id: string;
  assetName: string;
  assetType: string;
  status: "Ready For Validation";
  completedAt: string;
}

export interface QuickInsight {
  id: string;
  type: "progress" | "momentum" | "balance";
  title: string;
  description: string;
}

export interface RecommendedAction {
  id: string;
  type: "brand" | "persona" | "strategy";
  title: string;
  description: string;
  targetRoute: string;
}

export interface ResearchBundleSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  methodCount: number;
  timeline: string | null;
  price: number;
  originalPrice: number | null;
  discount: number | null;
  isRecommended: boolean;
  isPopular: boolean;
  includedTags: string[];
  methods: { methodName: string }[];
}

export interface BundleDetailResponse {
  bundle: Omit<ResearchBundleSummary, "methods"> & {
    assets: { assetName: string; assetDescription: string | null; assetIcon: string | null }[];
    methods: { methodName: string; description: string | null }[];
    trustSignals: string[];
  };
  savings: number;
}

export interface BundleListResponse {
  foundation: ResearchBundleSummary[];
  specialized: ResearchBundleSummary[];
}

export interface AvailableAsset {
  id: string;
  name: string;
  category: string;
  estimatedDuration: string;
  icon: string;
  isRecommended: boolean;
}

export interface CreatePlanBody {
  assetIds: string[];
  methods: { type: string; quantity: number }[];
}

export interface PlanDetailResponse {
  plan: {
    id: string;
    status: string;
    assets: { name: string; icon: string | null }[];
    methods: { type: string; quantity: number; unitPrice: number; subtotal: number }[];
    totalPrice: number;
    hasPaidMethods: boolean;
  };
}

export interface MethodConfig {
  type: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  confidence: string;
}

export interface StudyListItem {
  id: string;
  title: string;
  method: string;
  progress: number;
  status: string;
  personaId: string | null;
  brandAssetId: string | null;
  lastActivityAt: string;
}
