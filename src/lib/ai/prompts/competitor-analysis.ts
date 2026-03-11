// =============================================================
// Competitor Analysis Prompts — AI extraction from competitor URL content
// =============================================================

import { parseOutputLanguage } from "./product-analysis";

export { parseOutputLanguage };

/**
 * Structured result from competitor website AI analysis
 */
export interface CompetitorAnalysisResult {
  name: string;
  tagline: string | null;
  description: string;
  foundingYear: number | null;
  headquarters: string | null;
  employeeRange: string | null;
  valueProposition: string | null;
  targetAudience: string | null;
  differentiators: string[];
  mainOfferings: string[];
  pricingModel: string | null;
  pricingDetails: string | null;
  toneOfVoice: string | null;
  messagingThemes: string[];
  visualStyleNotes: string | null;
  strengths: string[];
  weaknesses: string[];
  socialLinks: Record<string, string> | null;
  hasBlog: boolean;
  hasCareersPage: boolean;
  competitiveScore: number;
}

/**
 * Build the system prompt for competitor analysis AI, localized to a target language.
 */
export function getCompetitorAnalysisSystemPrompt(language: string = "English"): string {
  return `You are an expert competitive intelligence analyst. Your job is to extract structured competitor information from website content and assess their competitive positioning.

You must respond with a valid JSON object containing these fields:
- name: string — the company/brand name
- tagline: string | null — their tagline or slogan if visible
- description: string — a concise description of what the company does (max 500 chars)
- foundingYear: number | null — year founded if mentioned
- headquarters: string | null — city/country if mentioned
- employeeRange: string | null — approximate size (e.g. "10-50", "50-200", "200-1000", "1000+")
- valueProposition: string | null — their core value proposition (max 300 chars)
- targetAudience: string | null — who they serve (max 300 chars)
- differentiators: string[] — what makes them unique (max 6 items, each max 100 chars)
- mainOfferings: string[] — their main products/services (max 8 items, each max 100 chars)
- pricingModel: string | null — pricing approach (e.g. "per seat", "tiered", "freemium", "custom")
- pricingDetails: string | null — specific pricing information if available
- toneOfVoice: string | null — description of their communication style (max 200 chars)
- messagingThemes: string[] — key themes in their messaging (max 5 items, each max 80 chars)
- visualStyleNotes: string | null — notes on their visual branding/design approach (max 200 chars)
- strengths: string[] — competitive strengths (max 6 items, each max 100 chars)
- weaknesses: string[] — potential weaknesses or gaps (max 6 items, each max 100 chars)
- socialLinks: object | null — social media URLs found (keys: linkedin, twitter, facebook, instagram, youtube)
- hasBlog: boolean — whether the site has a blog/insights section
- hasCareersPage: boolean — whether the site has a careers/jobs page
- competitiveScore: number — overall competitive threat score (0-100, where 100 = extremely strong competitor)

Guidelines:
- Extract real information from the content, do not fabricate
- If a field cannot be determined, use null (for optional strings/objects) or [] (for arrays)
- Be objective in your SWOT assessment — identify genuine strengths AND weaknesses
- The competitiveScore should reflect: market position, product maturity, brand strength, innovation
- Strengths and weaknesses should be actionable insights, not generic statements
- Social links should only include URLs actually found in the content

IMPORTANT: All text output MUST be written in ${language}. If the source content is in a different language, translate it to ${language}.`;
}

/**
 * Build user prompt for URL-based competitor analysis
 */
export function buildCompetitorUrlAnalysisPrompt(data: {
  url: string;
  title: string | null;
  description: string | null;
  bodyText: string;
  brandContext?: string;
}): string {
  const parts: string[] = [
    `Analyze the following competitor website and extract structured competitive intelligence.`,
    ``,
    `Competitor URL: ${data.url}`,
  ];

  if (data.title) {
    parts.push(`Page Title: ${data.title}`);
  }
  if (data.description) {
    parts.push(`Meta Description: ${data.description}`);
  }

  parts.push(``, `--- Website Content ---`, data.bodyText);

  if (data.brandContext) {
    parts.push(
      ``,
      `--- Our Brand Context (for relative positioning) ---`,
      data.brandContext,
      ``,
      `Use this brand context to assess the competitor's position RELATIVE to our brand. Score their competitive threat considering how directly they compete with us.`,
    );
  }

  parts.push(``, `Respond with a JSON object following the schema described in your instructions.`);

  return parts.join('\n');
}
