// =============================================================
// Content Studio types — S6.C (Prompt 4 + 5)
// =============================================================

// ─── Content Tab ─────────────────────────────────────────────

export type ContentTab = 'text' | 'images' | 'video' | 'carousel';

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
  index: number;
  imageUrl: string | null;
  textOverlay: string | null;
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
  campaignId: string;
  campaignTitle: string;
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
  content: string;
  qualityScore: number;
  costIncurred: number;
  generationTime: number;
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
  source: string | null;
  category: string;
  relevanceScore: number;
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
