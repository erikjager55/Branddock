import type { Campaign } from "@/data/mock-campaigns";
import type { CampaignWithMeta } from "@/types/campaign";

export function apiCampaignToMockFormat(c: CampaignWithMeta): Campaign {
  return {
    id: c.id,
    name: c.name,
    type: c.type as Campaign["type"],
    status: c.status as Campaign["status"],
    objective: c.objective ?? undefined,
    budgetRange: c.budgetMin != null && c.budgetMax != null ? [c.budgetMin, c.budgetMax] : undefined,
    channels: c.channels ?? undefined,
    assets: c.assets,
    deliverables: c.deliverables,
    modifiedTime: c.updatedAt,
    modifiedBy: c.modifiedBy ?? undefined,
  };
}

export function apiCampaignsToMockFormat(campaigns: CampaignWithMeta[]): Campaign[] {
  return campaigns.map(apiCampaignToMockFormat);
}
