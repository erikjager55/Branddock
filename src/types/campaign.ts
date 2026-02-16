// =============================================================
// Campaign types — Mock format (UI) + DB model + API contracts
// =============================================================

/** Mock-format Campaign used by UI components and adapters */
export interface Campaign {
  id: string;
  name: string;
  type: 'campaign-strategy' | 'brand-refresh' | 'content-strategy';
  status: 'ready' | 'draft' | 'generating';
  objective?: string;
  budgetRange?: [number, number];
  channels?: {
    social?: boolean;
    email?: boolean;
    ooh?: boolean;
  };
  assets: CampaignAsset[];
  deliverables: CampaignDeliverable[];
  modifiedTime?: string;
  modifiedBy?: string;
}

export interface CampaignDeliverable {
  id: string;
  name: string;
  description?: string;
  type: "document" | "image" | "video" | "email" | "website" | "social";
  status: "completed" | "in-progress" | "not-started";
  progress?: number;
  dueDate?: string;
  assignee?: string;
}

export interface CampaignAsset {
  id: string;
  name: string;
  type: "brand" | "product" | "persona" | "trend" | "research";
  trustLevel: "high" | "medium" | "low";
  trustLabel: string;
  locked?: boolean;
}

export interface CampaignWithMeta {
  id: string;
  name: string;
  type: string;
  status: string;
  objective: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  channels: { social?: boolean; email?: boolean; ooh?: boolean } | null;
  assets: CampaignAsset[];
  deliverables: CampaignDeliverable[];
  modifiedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignListResponse {
  campaigns: CampaignWithMeta[];
  stats: {
    total: number;
    ready: number;
    draft: number;
    generating: number;
  };
}

export interface CampaignListParams {
  status?: string;
  type?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateCampaignBody {
  name: string;
  type?: string;
  objective?: string;
  budgetMin?: number;
  budgetMax?: number;
  channels?: { social?: boolean; email?: boolean; ooh?: boolean };
  assets?: CampaignAsset[];
  deliverables?: CampaignDeliverable[];
}

export interface UpdateCampaignBody extends Partial<CreateCampaignBody> {
  status?: string;
  modifiedBy?: string;
}
