export interface KnowledgeWithMeta {
  id: string;
  title: string;
  description: string;
  type: string;
  author: string;
  category: string;
  tags: string[];
  difficulty: string | null;
  language: string;
  url: string;
  thumbnail: string | null;
  rating: number;
  status: string;
  addedBy: string | null;
  aiSummary: string | null;
  aiKeyTakeaways: string[] | null;
  relatedTrends: string[] | null;
  relatedPersonas: string[] | null;
  relatedAssets: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeListResponse {
  resources: KnowledgeWithMeta[];
  stats: {
    total: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

export interface KnowledgeListParams {
  type?: string;
  category?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateKnowledgeBody {
  title: string;
  description?: string;
  type?: string;
  author?: string;
  category?: string;
  tags?: string[];
  difficulty?: string;
  language?: string;
  url?: string;
  thumbnail?: string;
  rating?: number;
  aiSummary?: string;
  aiKeyTakeaways?: string[];
  relatedTrends?: string[];
  relatedPersonas?: string[];
  relatedAssets?: string[];
}

export interface UpdateKnowledgeBody extends Partial<CreateKnowledgeBody> {
  status?: string;
}
