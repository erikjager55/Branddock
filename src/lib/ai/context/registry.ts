// =============================================================
// Context Source Registry
//
// The ONLY place where you configure which database tables are
// available as AI context. Per table, define only metadata —
// never individual field names.
//
// New Prisma fields within a type are AUTOMATICALLY included.
// New content type = add one entry here (~10 lines).
// =============================================================

export interface ContextSourceConfig {
  // Identity
  key: string;
  label: string;
  icon: string;
  category: 'knowledge' | 'strategy' | 'brand' | 'validation';

  // Database mapping
  prismaModel: string;
  workspaceFilter: string;

  // Display fields (for the selector modal)
  titleField: string;
  descriptionField?: string;
  statusField?: string;

  // Serialization rules
  excludeFields: string[];
  includeRelations?: string[];

  // Optional: per-source override for the serialized record cap (default 2000).
  // Knowledge resources carry full document bodies and need more room.
  maxSerializedLength?: number;

  // Optional: custom formatting hints. 'fulltext' lifts the 500-char per-field
  // truncation for document-body fields.
  formatHints?: Record<string, 'currency' | 'date' | 'list' | 'percentage' | 'json_summary' | 'fulltext'>;
}

export const CONTEXT_REGISTRY: ContextSourceConfig[] = [
  // ────────────────────────────────────
  // BRAND
  // ────────────────────────────────────
  {
    key: 'brand_asset',
    label: 'Brand Foundation',
    icon: 'Fingerprint',
    category: 'brand',
    prismaModel: 'brandAsset',
    workspaceFilter: 'workspaceId',
    titleField: 'name',
    descriptionField: 'description',
    statusField: 'status',
    excludeFields: [
      'id', 'createdAt', 'updatedAt', 'workspaceId', 'slug',
      'lockedById', 'lockedAt', 'isLocked', 'frameworkData', 'content',
    ],
    includeRelations: ['researchMethods'],
  },
  // Brandstyle is always-on context (loaded via buildStyleguideContext),
  // not shown in the knowledge selector.
  {
    key: 'persona',
    label: 'Personas',
    icon: 'Users',
    category: 'brand',
    prismaModel: 'persona',
    workspaceFilter: 'workspaceId',
    titleField: 'name',
    descriptionField: 'occupation',
    excludeFields: [
      'id', 'createdAt', 'updatedAt', 'workspaceId',
      'lockedById', 'lockedAt', 'isLocked',
      'avatarUrl', 'avatarSource', 'strategicImplications',
      'validationPercentage',
    ],
  },

  // ────────────────────────────────────
  // KNOWLEDGE
  // ────────────────────────────────────
  {
    key: 'product',
    label: 'Products & Services',
    icon: 'Package',
    category: 'knowledge',
    prismaModel: 'product',
    workspaceFilter: 'workspaceId',
    titleField: 'name',
    descriptionField: 'description',
    statusField: 'status',
    excludeFields: [
      'id', 'createdAt', 'updatedAt', 'workspaceId', 'slug',
      'source', 'sourceUrl', 'categoryIcon', 'analysisData',
    ],
    includeRelations: ['linkedPersonas'],
    formatHints: { features: 'list', benefits: 'list', useCases: 'list' },
  },
  {
    key: 'detected_trend',
    label: 'Trend Radar',
    icon: 'Radar',
    category: 'knowledge',
    prismaModel: 'detectedTrend',
    workspaceFilter: 'workspaceId',
    titleField: 'title',
    descriptionField: 'description',
    statusField: 'impactLevel',
    excludeFields: [
      'id', 'createdAt', 'updatedAt', 'workspaceId', 'slug',
      'rawExcerpt', 'aiAnalysis', 'isDismissed', 'dismissedAt',
    ],
    includeRelations: [],
  },
  {
    key: 'knowledge_resource',
    label: 'Knowledge Library',
    icon: 'BookOpen',
    category: 'knowledge',
    prismaModel: 'knowledgeResource',
    workspaceFilter: 'workspaceId',
    titleField: 'title',
    descriptionField: 'description',
    statusField: 'status',
    // `content` (extracted document body) is intentionally NOT excluded — it is
    // the substance the user attaches. 'fulltext' + a larger record cap let it
    // reach the prompt beyond the generic 500-char truncation.
    maxSerializedLength: 7000,
    formatHints: { content: 'fulltext' },
    excludeFields: [
      'id', 'createdAt', 'updatedAt', 'workspaceId', 'slug',
      'fileUrl', 'fileSize', 'fileType', 'fileName',
      'importedMetadata', 'isFavorite', 'isArchived', 'isFeatured',
      'addedBy', 'createdBy', 'thumbnail',
      // Legacy/noise fields that would otherwise serialize as bare scalars.
      'aiSummary', 'aiKeyTakeaways', 'relatedTrends', 'relatedPersonas',
      'relatedAssets', 'difficulty', 'rating', 'language',
    ],
  },
  {
    key: 'competitor',
    label: 'Competitors',
    icon: 'Swords',
    category: 'knowledge',
    prismaModel: 'competitor',
    workspaceFilter: 'workspaceId',
    titleField: 'name',
    descriptionField: 'description',
    statusField: 'status',
    excludeFields: [
      'id', 'createdAt', 'updatedAt', 'workspaceId', 'slug',
      'lockedById', 'lockedAt', 'isLocked', 'createdById',
      'websiteUrl', 'scrapedData', 'lastScrapedAt',
    ],
  },

  // ────────────────────────────────────
  // STRATEGY
  // ────────────────────────────────────
  {
    key: 'business_strategy',
    label: 'Business Strategy',
    icon: 'Target',
    category: 'strategy',
    prismaModel: 'businessStrategy',
    workspaceFilter: 'workspaceId',
    titleField: 'name',
    descriptionField: 'description',
    statusField: 'status',
    excludeFields: [
      'id', 'createdAt', 'updatedAt', 'workspaceId', 'slug',
      'isArchived',
    ],
    includeRelations: ['objectives'],
  },
  {
    key: 'deliverable',
    label: 'Content & Deliverables',
    icon: 'FileText',
    category: 'strategy',
    prismaModel: 'deliverable',
    workspaceFilter: 'campaignId', // Deliverables don't have workspaceId directly
    titleField: 'title',
    descriptionField: 'contentType',
    statusField: 'status',
    excludeFields: [
      'id', 'createdAt', 'updatedAt', 'campaignId',
      'generatedImageUrls', 'generatedVideoUrl', 'generatedSlides',
      'generatedContent', 'qualityMetrics', 'checklistItems',
      'settings', 'prompt', 'aiModel', 'lastAutoSavedAt',
      'isFavorite', 'contentTab',
    ],
  },
];

// ────────────────────────────────────
// EXPLICITLY EXCLUDED (with reason)
// ────────────────────────────────────
// Questionnaires → Meta/config, not content
// Research Hub   → Config, not relevant for conversation
// Settings       → System config, not relevant
