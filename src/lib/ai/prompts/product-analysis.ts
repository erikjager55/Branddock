// =============================================================
// Product Analysis Prompts — AI extraction from URL/PDF content
// =============================================================

/**
 * System prompt for product analysis AI
 */
export const PRODUCT_ANALYSIS_SYSTEM_PROMPT = `You are an expert product analyst. Your job is to extract structured product information from the provided content.

You must respond with a valid JSON object containing these fields:
- name: string — the product or service name
- description: string — a concise product description (max 500 chars)
- category: string — one of: "food-beverage", "fashion-apparel", "beauty-personal-care", "home-living", "consumer-electronics", "health-pharma", "industrial-manufacturing", "automotive-mobility", "software-saas", "mobile-apps", "digital-content", "technology-hardware", "consulting-advisory", "creative-agency", "financial-services", "education-training", "healthcare-services", "real-estate-property", "hospitality-travel", "sports-recreation", "media-entertainment", "other"
- pricingModel: string | null — pricing model (e.g. "subscription", "one-time", "freemium", "enterprise", "custom")
- pricingDetails: string | null — specific pricing information if available
- features: string[] — key features (max 15 items, each max 100 chars)
- benefits: string[] — key benefits for customers (max 10 items, each max 100 chars)
- useCases: string[] — typical use cases (max 8 items, each max 100 chars)

Guidelines:
- Extract real information from the content, do not fabricate
- If a field cannot be determined, use null (for optional strings) or [] (for arrays)
- Category must be one of the options listed above — pick the most specific match
- Keep descriptions factual and concise
- Features should be specific capabilities, not marketing fluff
- Benefits should focus on customer outcomes
- Use cases should describe concrete scenarios`;

/**
 * Build user prompt for URL-based product analysis
 */
export function buildUrlAnalysisPrompt(data: {
  url: string;
  title: string | null;
  description: string | null;
  bodyText: string;
  brandContext?: string;
}): string {
  const parts: string[] = [
    `Analyze the following website content and extract structured product information.`,
    ``,
    `Source URL: ${data.url}`,
  ];

  if (data.title) {
    parts.push(`Page Title: ${data.title}`);
  }
  if (data.description) {
    parts.push(`Meta Description: ${data.description}`);
  }

  parts.push(``, `--- Page Content ---`, data.bodyText);

  if (data.brandContext) {
    parts.push(``, `--- Brand Context ---`, data.brandContext);
  }

  parts.push(``, `Respond with a JSON object following the schema described in your instructions.`);

  return parts.join('\n');
}

/**
 * Build user prompt for PDF-based product analysis
 */
export function buildPdfAnalysisPrompt(data: {
  fileName: string;
  text: string;
  metadata: { title: string | null; author: string | null; creator: string | null };
  brandContext?: string;
}): string {
  const parts: string[] = [
    `Analyze the following PDF document content and extract structured product information.`,
    ``,
    `File Name: ${data.fileName}`,
  ];

  if (data.metadata.title) {
    parts.push(`Document Title: ${data.metadata.title}`);
  }
  if (data.metadata.author) {
    parts.push(`Author: ${data.metadata.author}`);
  }

  parts.push(``, `--- Document Content ---`, data.text);

  if (data.brandContext) {
    parts.push(``, `--- Brand Context ---`, data.brandContext);
  }

  parts.push(``, `Respond with a JSON object following the schema described in your instructions.`);

  return parts.join('\n');
}

/**
 * Type for the structured AI response
 */
export interface ProductAnalysisResult {
  name: string;
  description: string;
  category: string;
  pricingModel: string | null;
  pricingDetails: string | null;
  features: string[];
  benefits: string[];
  useCases: string[];
}
