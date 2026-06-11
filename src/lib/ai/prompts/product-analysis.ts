// =============================================================
// Product Analysis Prompts — AI extraction from URL/PDF content
// =============================================================

// Untrusted-content fencing moved to its own module; re-exported here so
// existing importers keep working.
export { fenceUntrustedContent } from '@/lib/ai/untrusted-fence';
import { fenceUntrustedContent } from '@/lib/ai/untrusted-fence';

/**
 * Parse the primary language from an Accept-Language header value.
 * Returns a human-readable language name (e.g. "Dutch", "English", "German").
 */
export function parseOutputLanguage(acceptLanguage: string | null): string {
  if (!acceptLanguage) return "English";
  // Take the first language tag (highest priority)
  const primary = acceptLanguage.split(",")[0]?.split(";")[0]?.trim().toLowerCase() ?? "";
  const langCode = primary.split("-")[0];
  const LANG_MAP: Record<string, string> = {
    nl: "Dutch", en: "English", de: "German", fr: "French", es: "Spanish",
    it: "Italian", pt: "Portuguese", ja: "Japanese", ko: "Korean", zh: "Chinese",
    ar: "Arabic", ru: "Russian", pl: "Polish", sv: "Swedish", da: "Danish",
    no: "Norwegian", fi: "Finnish", tr: "Turkish", cs: "Czech", ro: "Romanian",
    hu: "Hungarian", el: "Greek", he: "Hebrew", th: "Thai", vi: "Vietnamese",
    id: "Indonesian", ms: "Malay", uk: "Ukrainian", hi: "Hindi",
  };
  return LANG_MAP[langCode] ?? "English";
}

/**
 * Build the system prompt for product analysis AI, localized to a target language.
 */
export function getProductAnalysisSystemPrompt(language: string = "English"): string {
  return `You are an expert product analyst. Your job is to extract structured product information from the provided content.

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
- Use cases should describe concrete scenarios

IMPORTANT: All text output (name, description, features, benefits, useCases, pricingDetails) MUST be written in ${language}. If the source content is in a different language, translate it to ${language}.`;
}

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

  // Title, meta description and body text are all scraped (attacker-
  // controllable), so they go inside the fence together.
  const scraped: string[] = [];
  if (data.title) {
    scraped.push(`Page Title: ${data.title}`);
  }
  if (data.description) {
    scraped.push(`Meta Description: ${data.description}`);
  }
  scraped.push(``, `--- Page Content ---`, data.bodyText);

  parts.push(``, fenceUntrustedContent(scraped.join('\n'), 'scraped website'));

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

  // PDF metadata and text come from the uploaded document (attacker-
  // controllable), so they go inside the fence together.
  const untrusted: string[] = [];
  if (data.metadata.title) {
    untrusted.push(`Document Title: ${data.metadata.title}`);
  }
  if (data.metadata.author) {
    untrusted.push(`Author: ${data.metadata.author}`);
  }
  untrusted.push(``, `--- Document Content ---`, data.text);

  parts.push(``, fenceUntrustedContent(untrusted.join('\n'), 'uploaded PDF document'));

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
