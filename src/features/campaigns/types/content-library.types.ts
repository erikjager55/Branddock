export interface ContentLibraryItem {
  id: string;
  title: string;
  type: string;
  typeCategory: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  qualityScore: number | null;
  campaignId: string;
  campaignName: string;
  campaignType: "STRATEGIC" | "QUICK";
  isFavorite: boolean;
  wordCount: number | null;
  updatedAt: string;
}

export interface ContentLibraryStatsResponse {
  totalContent: number;
  complete: number;
  inProgress: number;
  avgQuality: number;
}

export interface ContentLibraryParams {
  type?: string;
  campaignType?: string;
  status?: string;
  sort?: string;
  favorites?: boolean;
  groupByCampaign?: boolean;
  search?: string;
}
