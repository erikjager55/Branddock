import type { KnowledgeResource } from "@/data/mock-knowledge";
import type { KnowledgeWithMeta } from "@/types/knowledge";

export function apiKnowledgeToMockFormat(r: KnowledgeWithMeta): KnowledgeResource {
  return {
    id: r.id, title: r.title, description: r.description,
    type: r.type as KnowledgeResource["type"], author: r.author,
    category: r.category, tags: r.tags,
    difficulty: (r.difficulty as KnowledgeResource["difficulty"]) ?? undefined,
    language: r.language, url: r.url, thumbnail: r.thumbnail ?? undefined,
    rating: r.rating, status: r.status as KnowledgeResource["status"],
    dateAdded: r.createdAt, dateUpdated: r.updatedAt,
    addedBy: r.addedBy ?? undefined, aiSummary: r.aiSummary ?? undefined,
    aiKeyTakeaways: r.aiKeyTakeaways ?? undefined,
    relatedTrends: r.relatedTrends ?? undefined,
    relatedPersonas: r.relatedPersonas ?? undefined,
    relatedAssets: r.relatedAssets ?? undefined,
  };
}

export function apiKnowledgeToMockFormatList(resources: KnowledgeWithMeta[]): KnowledgeResource[] {
  return resources.map(apiKnowledgeToMockFormat);
}
