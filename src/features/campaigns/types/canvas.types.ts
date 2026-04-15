// =============================================================
// Canvas UI Types
// =============================================================

import type { ComponentType } from 'react';

// Re-export accordion types for convenience
export type { StepSummaryData, AccordionStepStatus, StepNumber } from './accordion.types';

export interface CanvasVariant {
  index: number;
  content: string;
  tone?: string;
  /** Standalone call-to-action text (button label / link text) */
  cta?: string;
  isSelected: boolean;
}

export interface CanvasImageVariant {
  index: number;
  url: string;
  prompt: string;
  isSelected: boolean;
}

export interface CanvasComponentResponse {
  id: string;
  deliverableId: string;
  componentType: string;
  groupType: string;
  groupIndex: number;
  order: number;
  status: string;
  generatedContent: string | null;
  imageUrl: string | null;
  imageSource: string | null;
  videoUrl: string | null;
  visualBrief: string | null;
  aiModel: string | null;
  promptUsed: string | null;
  rating: number | null;
  feedbackText: string | null;
  variantGroup: string | null;
  variantIndex: number;
  isSelected: boolean;
  aiProvider: string | null;
  imagePromptUsed: string | null;
  iterationCount: number;
  generatedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Preview Types ────────────────────────────────────────────

/** Content assembled from selected variants for preview rendering */
export interface PreviewContent {
  [variantGroup: string]: {
    content: string | null;
    type: 'text' | 'image' | 'video' | 'audio';
    /** Standalone call-to-action text extracted from variant */
    cta?: string | null;
    metadata?: {
      altText?: string;
      duration?: number;
    };
  };
}

/**
 * The hero image picked by the user via InsertImageModal in Step 3.
 * Null when nothing has been selected yet — preview components render
 * a placeholder in that case.
 */
export interface CanvasHeroImage {
  url: string;
  mediaAssetId: string | null;
  alt?: string;
}

/** Props shared by all platform preview components */
export interface PlatformPreviewProps {
  previewContent: PreviewContent;
  imageVariants: CanvasImageVariant[];
  isGenerating: boolean;
  /** Hero image selected via InsertImageModal (Step 3 Medium). */
  heroImage?: CanvasHeroImage | null;
  /** Click handler for the placeholder slot — opens InsertImageModal. */
  onAddImage?: () => void;
  /** Medium config values from the Step 3 config panel. */
  mediumConfig?: Record<string, unknown>;
  /** Workspace brand name — used in platform chrome instead of hardcoded "Brand Name". */
  brandName?: string;
  /** Platform identifier — used by multi-platform components (e.g. VideoPreview for TikTok vs YouTube). */
  platform?: string;
}

/** Registry entry for platform previews */
export interface PreviewRegistryEntry {
  component: ComponentType<PlatformPreviewProps>;
  label: string;
}

// ─── Validation Types ─────────────────────────────────────────

export type ValidationStatus = 'pass' | 'warn' | 'fail';

export interface CharCountCheckResult {
  variantGroup: string;
  charCount: number;
  limit: number;
  percentage: number;
  status: ValidationStatus;
}

export interface ToneCheckResult {
  status: ValidationStatus;
  message: string;
}

export interface BrandVoiceCheckResult {
  score: number;
  alignment: 'Strong' | 'Moderate' | 'Weak' | 'Pending';
}

// ─── Approval Types ──────────────────────────────────────────

export type ApprovalStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED' | 'PUBLISHED';

export interface ApprovalResponse {
  deliverableId: string;
  approvalStatus: ApprovalStatus;
  approvalNote: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface PublishResponse {
  deliverableId: string;
  publishedAt: string;
  approvalStatus: 'PUBLISHED';
  scheduledPublishDate: string | null;
}

export interface DeriveResponse {
  newDeliverableId: string;
  sourceDeliverableId: string;
  title: string;
}

// ─── Publish Suggestion Types ─────────────────────────────────

export interface PublishSuggestionData {
  suggestedDate: string;
  reasoning: string;
}
