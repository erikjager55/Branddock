// =============================================================
// SEO Pipeline Types
//
// Types for the 8-step SEO chain-of-prompts pipeline that runs
// inside the Content Canvas for website deliverable types.
// =============================================================

// ─── User Input ──────────────────────────────────────────────

export interface SeoInput {
  /** Primary keyword to target (required) */
  primaryKeyword: string;
  /** Funnel stage determines content angle and CTA approach */
  funnelStage: 'awareness' | 'consideration' | 'decision';
  /** Optional competitor URLs for direct analysis (max 5). Falls back to Gemini search grounding if empty. */
  competitorUrls?: string[];
  /** Secondary keywords from content type inputs — used as hints in Step 2 Keyword Research */
  secondaryKeywordHints?: string[];
  /** Conversion goal from content type inputs (e.g. "Email Signup", "Free Trial") — used in Step 1 Project Briefing */
  conversionGoal?: string;
  /** Traffic source from content type inputs (e.g. "Paid Ads", "Organic Search") — used in Step 1 */
  trafficSource?: string;
}

// ─── Pipeline Steps ──────────────────────────────────────────

export const SEO_STEP_DEFINITIONS = [
  { step: 1, name: 'project_briefing', label: 'Project Briefing' },
  { step: 2, name: 'keyword_research', label: 'Keyword Research' },
  { step: 3, name: 'competitor_analysis', label: 'Competitor Analysis' },
  { step: 4, name: 'serp_gaps_eeat', label: 'SERP Gaps & E-E-A-T' },
  { step: 5, name: 'outline_structure', label: 'Outline & Internal Links' },
  { step: 6, name: 'first_draft', label: 'First Draft' },
  { step: 7, name: 'editorial_review', label: 'Editorial Review' },
  { step: 8, name: 'publication_prep', label: 'Publication Prep' },
] as const;

export type SeoStepName = (typeof SEO_STEP_DEFINITIONS)[number]['name'];

export type SeoStepStatus = 'pending' | 'running' | 'complete' | 'error';

export interface SeoStepEvent {
  step: number;
  name: SeoStepName;
  label: string;
  status: SeoStepStatus;
  preview: string | null;
  totalSteps: 8;
}

// ─── Step Outputs ────────────────────────────────────────────

export interface SeoStepOutput {
  step: number;
  name: SeoStepName;
  rawText: string;
}

export interface SeoPipelineState {
  outputs: SeoStepOutput[];
  /** Accumulated text of all previous step outputs for context injection */
  accumulatedContext: string;
}

// ─── Step 1: Project Briefing ────────────────────────────────

export interface ProjectBriefing {
  context: string;
  pageGoal: string;
  targetAudience: string[];
  primarySearchIntent: string;
  secondarySearchIntent: string;
  customerJourneyRole: string;
  conversionActions: string[];
}

// ─── Step 2: Keyword Research ────────────────────────────────

export interface KeywordResearch {
  primaryKeyword: string;
  supportingKeywords: string[];
  longTailQuestions: string[];
  underlyingProblems: string[];
  coreEntities: string[];
  topicClusters: Array<{ name: string; keywords: string[] }>;
}

// ─── Step 3: Competitor Analysis ─────────────────────────────

export interface CompetitorPageAnalysis {
  url: string;
  pageType: string;
  wordCount: number;
  mainTopics: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface CompetitorAnalysis {
  competitors: CompetitorPageAnalysis[];
  recurringTopics: string[];
  intentFulfillment: string;
  dominantFormat: string;
  dominantLength: number;
  opportunities: string[];
}

// ─── Step 4: SERP Gaps & E-E-A-T ────────────────────────────

export interface SerpGapsEeat {
  contentGaps: string[];
  featuredSnippetOpportunities: string[];
  requiredContentFormats: string[];
  eeatRequirements: string[];
  schemaMarkupOpportunities: string[];
  uniqueAngles: string[];
}

// ─── Step 5: Outline ─────────────────────────────────────────

export interface PageOutline {
  h1: string;
  pitch: string;
  sections: Array<{
    h2: string;
    goal: string;
    h3s: string[];
    contentBullets: string[];
    eeatElements: string[];
    schemaMarkup: string | null;
  }>;
  faqQuestions: string[];
  internalLinks: Array<{ anchor: string; targetPage: string }>;
  callToAction: string;
  titleTag: string;
  metaDescription: string;
}

// ─── Step 7: Editorial Review ────────────────────────────────

export interface EditorialReview {
  improvements: string[];
  revisedContent: string;
}

// ─── Step 8: SEO Checklist ───────────────────────────────────

export interface SeoChecklist {
  titleTag: string;
  metaDescription: string;
  h1: string;
  urlSlug: string;
  headingStructure: string;
  internalLinks: string;
  imageAltTexts: string[];
  faqSchema: string | null;
  howToSchema: string | null;
  canonicalTag: string | null;
  ogTitle: string;
  ogDescription: string;
}

export interface PublicationPrep {
  finalContent: string;
  checklist: SeoChecklist;
}

// ─── Website type detection ──────────────────────────────────

export const WEBSITE_DELIVERABLE_TYPES = new Set([
  'landing-page',
  'product-page',
  'faq-page',
  'comparison-page',
  'microsite',
]);

/** Map deliverable type to default page goal for SEO prompts */
export const PAGE_GOAL_MAP: Record<string, string> = {
  'landing-page': 'lead generation or conversion',
  'product-page': 'product sales or sign-ups',
  'faq-page': 'information and support',
  'comparison-page': 'competitive comparison and conversion',
  'microsite': 'campaign engagement and conversion',
};
