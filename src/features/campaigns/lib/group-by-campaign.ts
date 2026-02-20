import type { ContentLibraryItem } from "../types/content-library.types";

export interface ContentGroup {
  campaignId: string;
  campaignName: string;
  campaignType: string;
  items: ContentLibraryItem[];
}

export function groupByCampaign(items: ContentLibraryItem[]): ContentGroup[] {
  const groupMap = new Map<string, ContentGroup>();

  for (const item of items) {
    const existing = groupMap.get(item.campaignId);
    if (existing) {
      existing.items.push(item);
    } else {
      groupMap.set(item.campaignId, {
        campaignId: item.campaignId,
        campaignName: item.campaignName,
        campaignType: item.campaignType,
        items: [item],
      });
    }
  }

  return Array.from(groupMap.values());
}
