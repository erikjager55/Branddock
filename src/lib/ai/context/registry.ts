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

  // Optional: custom formatting hints
  formatHints?: Record<string, 'currency' | 'date' | 'list' | 'percentage' | 'json_summary'>;
}

export const CONTEXT_REGISTRY: ContextSourceConfig[] = [
  // ────────────────────────────────────
  // BRAND
  // ────────────────────────────────────
  {
    key: 'brand_asset',
    label: 'Brand Assets',
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
  {
    key: 'brandstyle',
    label: 'Brand Style',
    icon: 'Palette',
    category: 'brand',
    prismaModel: 'brandStyleguide',
    workspaceFilter: 'workspaceId',
    titleField: 'id', // No "name" field, use sourceType as title fallback
    descriptionField: undefined,
    statusField: 'status',
    excludeFields: [
      'id', 'createdAt', 'updatedAt', 'workspaceId',
      'createdById', 'analysisJobId', 'analysisStatus',
      'sourceUrl', 'sourceFileName',
      'logoSavedForAi', 'colorsSavedForAi', 'typographySavedForAi',
      'toneSavedForAi', 'imagerySavedForAi',
    ],
    includeRelations: ['colors'],
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
    key: 'market_insight',
    label: 'Market Insights',
    icon: 'TrendingUp',
    category: 'knowledge',
    prismaModel: 'marketInsight',
    workspaceFilter: 'workspaceId',
    titleField: 'title',
    descriptionField: 'description',
    statusField: 'impactLevel',
    excludeFields: [
      'id', 'createdAt', 'updatedAt', 'workspaceId', 'slug',
      'aiResearchPrompt', 'aiResearchConfig', 'useBrandContext',
    ],
    includeRelations: ['sourceUrls'],
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
    excludeFields: [
      'id', 'createdAt', 'updatedAt', 'workspaceId', 'slug',
      'fileUrl', 'fileSize', 'fileType', 'fileName',
      'importedMetadata', 'isFavorite', 'isArchived', 'isFeatured',
      'addedBy', 'createdBy', 'thumbnail',
    ],
  },

  // ────────────────────────────────────
  // STRATEGY
  // ────────────────────────────────────
  {
    key: 'campaign',
    label: 'Campaigns',
    icon: 'Megaphone',
    category: 'strategy',
    prismaModel: 'campaign',
    workspaceFilter: 'workspaceId',
    titleField: 'title',
    descriptionField: 'description',
    statusField: 'status',
    excludeFields: [
      'id', 'createdAt', 'updatedAt', 'workspaceId', 'slug',
      'isArchived', 'isSavedAsTemplate', 'templateName',
      'strategy', 'aiResearchConfig',
    ],
    includeRelations: ['deliverables'],
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
// Personas      → You're already talking TO a persona
// Questionnaires → Meta/config, not content
// Research Hub   → Config, not relevant for conversation
// Settings       → System config, not relevant
// OKRs/Strategy  → Too abstract, confusing for persona character
