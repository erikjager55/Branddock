// =============================================================
// Content Studio types — S6.C (Prompt 4 + 5) + Pipeline Extension
// =============================================================

// ─── Content Tab ─────────────────────────────────────────────

export type ContentTab = 'text' | 'images' | 'video' | 'carousel';

// ─── Pipeline Status + Component Status ─────────────────────

export type PipelineStatusType =
  | 'LEGACY'
  | 'BRIEF_REVIEW'
  | 'INITIALIZED'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'COMPLETE';

export type ComponentStatusType =
  | 'PENDING'
  | 'GENERATING'
  | 'GENERATED'
  | 'NEEDS_REVISION'
  | 'APPROVED'
  | 'SKIPPED';

export type ImageSourceType =
  | 'ai_generated'
  | 'stock_photo'
  | 'upload'
  | 'product_library'
  | 'illustration';

// ─── Deliverable Component (client state) ───────────────────

export interface DeliverableComponentState {
  id: string;
  deliverableId: string;
  componentType: string;
  groupType: string;
  groupIndex: number;
  order: number;
  status: ComponentStatusType;
  generatedContent: string | null;
  imageUrl: string | null;
  imageSource: string | null;
  videoUrl: string | null;
  visualBrief: string | null;
  aiModel: string | null;
  promptUsed: string | null;
  cascadingContext: string | null;
  rating: number | null;
  feedbackText: string | null;
  personaReactions: PersonaReaction[] | null;
  generatedAt: string | null;
  approvedAt: string | null;
  version: number;
  label: string;
}

// ─── Brief Review ───────────────────────────────────────────

export interface BriefReviewData {
  brief: DeliverableBrief;
  aiContext: AiContextPreview;
  gaps: BriefGap[];
}

export interface DeliverableBrief {
  objective: string | null;
  keyMessage: string | null;
  toneDirection: string | null;
  cta: string | null;
  contentOutline: string[] | null;
  targetPersonas: string[] | null;
  channel: string | null;
  phase: string | null;
}

export interface AiContextPreview {
  brandName: string | null;
  brandVoice: string | null;
  archetype: string | null;
  competitors: string[];
  activeTrends: string[];
  personas: { id: string; name: string }[];
  products: { id: string; name: string }[];
  completenessPercentage: number;
}

export interface BriefGap {
  field: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

// ─── Master Message ─────────────────────────────────────────

export interface MasterMessage {
  coreClaim: string;
  proofPoint: string;
  emotionalHook: string;
  primaryCta: string;
}

// ─── Persona Reaction ───────────────────────────────────────

export interface PersonaReaction {
  personaId: string;
  personaName: string;
  reaction: string;
  relevanceScore: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

// ─── Pipeline Progress ──────────────────────────────────────

export interface PipelineProgress {
  approved: number;
  total: number;
  percentage: number;
}

// ─── Component Generation Request ───────────────────────────

export interface GenerateComponentBody {
  aiModel?: string;
  additionalInstructions?: string;
}

export interface RegenerateComponentBody {
  feedback: string;
  aiModel?: string;
}

// ─── Component Update ───────────────────────────────────────

export interface UpdateComponentBody {
  status?: ComponentStatusType;
  rating?: number;
  feedbackText?: string;
  generatedContent?: string;
  imageUrl?: string;
  imageSource?: ImageSourceType;
  videoUrl?: string;
  visualBrief?: string;
}

// ─── Brief Context API Response ─────────────────────────────

export interface BriefContextResponse {
  brief: DeliverableBrief;
  aiContext: AiContextPreview;
  gaps: BriefGap[];
  enrichedBrief: string | null;
  additionalInstructions: string | null;
}

// ─── Deliverable Brief Settings (from DB settings JSON) ─────

export interface DeliverableBriefSettings {
  objective?: string;
  keyMessage?: string;
  toneDirection?: string;
  callToAction?: string;
  contentOutline?: string[];
}

// ─── Consistency Check ──────────────────────────────────────

export interface ConsistencyCheckResult {
  overallScore: number;
  flags: ConsistencyFlag[];
  deliverableCount: number;
}

export interface ConsistencyFlag {
  type: 'tone_mismatch' | 'message_drift' | 'visual_inconsistency' | 'cta_conflict';
  severity: 'high' | 'medium' | 'low';
  description: string;
  deliverables: string[];
}

// ─── Type-Specific Settings ──────────────────────────────────

export interface TextSettings {
  tone: string;
  length: 'short' | 'medium' | 'long';
  targetAudience: string;
}

export interface ImageSettings {
  aspectRatio: string;
  visualStyle: string;
  colorPalette: string;
}

export interface VideoSettings {
  duration: 15 | 30 | 45 | 60;
  style: string;
  backgroundMusic: boolean;
}

export interface CarouselSettings {
  aspectRatio: string;
  visualStyle: string;
  slideCount: number;
}

export type TypeSettings = TextSettings | ImageSettings | VideoSettings | CarouselSettings;

// ─── Carousel ────────────────────────────────────────────────

export interface CarouselSlide {
  slideNumber: number;
  imageUrl: string | null;
  textOverlay: string | null;
  subtitle?: string | null;
}

// ─── Checklist ───────────────────────────────────────────────

export interface ChecklistItem {
  label: string;
  checked: boolean;
}

// ─── Studio State (GET) ──────────────────────────────────────

export interface StudioStateResponse {
  id: string;
  title: string;
  contentType: string;
  contentTab: ContentTab | null;
  status: string;
  prompt: string | null;
  aiModel: string | null;
  settings: TypeSettings | null;
  generatedText: string | null;
  generatedImageUrls: string[];
  generatedVideoUrl: string | null;
  generatedSlides: CarouselSlide[] | null;
  qualityScore: number | null;
  qualityMetrics: Record<string, number> | null;
  checklistItems: ChecklistItem[] | null;
  isFavorite: boolean;
  lastAutoSavedAt: string | null;
  pipelineStatus: PipelineStatusType | null;
  campaignId: string;
  campaignTitle: string;
  briefSettings: DeliverableBriefSettings | null;
  targetPersonaNames: string[];
}

// ─── Generate Content ────────────────────────────────────────

export interface GenerateContentBody {
  model: string;
  prompt: string;
  settings: TypeSettings;
  knowledgeAssetIds?: string[];
  personaIds?: string[];
}

export interface GenerateContentResponse {
  generatedText: string | null;
  generatedImageUrls: string[];
  generatedVideoUrl: string | null;
  generatedSlides: CarouselSlide[];
  qualityScore: number;
  qualityMetrics: Record<string, number>;
  costIncurred: number;
  generationTime: number;
  contentTab: string;
  model: string;
  validation?: {
    warnings: Array<{ check: string; severity: 'error' | 'warning' | 'info'; message: string; match?: string }>;
    passedChecks: string[];
    score: number;
  };
}

// ─── Update Studio ───────────────────────────────────────────

export interface UpdateStudioBody {
  prompt?: string;
  aiModel?: string;
  settings?: TypeSettings;
  contentTab?: ContentTab;
  generatedText?: string;
  generatedImageUrls?: string[];
  generatedVideoUrl?: string;
  generatedSlides?: CarouselSlide[];
  checklistItems?: ChecklistItem[];
}

// ─── Cost Estimate ───────────────────────────────────────────

export interface CostEstimateResponse {
  estimatedCost: number;
  model: string;
  contentType: ContentTab;
}

// ─── AI Model ────────────────────────────────────────────────

export interface AiModelOption {
  id: string;
  name: string;
  provider: string;
  description: string;
  costPerGeneration: number;
}

// ─── Quality ─────────────────────────────────────────────────

export interface QualityMetric {
  name: string;
  score: number;
  maxScore: number;
}

export interface QualityScoreResponse {
  overall: number;
  metrics: QualityMetric[];
}

// ─── Improve ─────────────────────────────────────────────────

export interface ImproveSuggestionItem {
  id: string;
  metric: string;
  impactPoints: number;
  currentText: string | null;
  suggestedText: string | null;
  reason: string | null;
  status: 'PENDING' | 'APPLIED' | 'DISMISSED' | 'PREVIEWING';
}

export interface ImproveSuggestionsResponse {
  currentScore: number;
  targetScore: number;
  potentialScore: number;
  suggestions: ImproveSuggestionItem[];
}

// ─── Research Insights ───────────────────────────────────────

export interface AvailableInsight {
  id: string;
  title: string;
  description: string | null;
  source: string | null;
  category: string;
  impactLevel: string;
  scope: string;
  timeframe: string;
  relevanceScore: number;
  whyNow: string | null;
}

export type InsertFormatType = 'INLINE' | 'QUOTE' | 'DATA_VIZ' | 'AI_ADAPTED';
export type InsertLocationType = 'cursor' | 'ai';

export interface InsertInsightBody {
  insightId: string;
  format: InsertFormatType;
  location: InsertLocationType;
}

// ─── Versions ────────────────────────────────────────────────

export interface ContentVersionItem {
  id: string;
  versionNumber: number;
  qualityScore: number | null;
  contentPreview: string | null;
  createdAt: string;
  createdBy: string | null;
}

// ─── Export ──────────────────────────────────────────────────

export interface ExportBody {
  format: string;
}

export interface ExportResponse {
  downloadUrl: string;
  expiresAt: string;
}
