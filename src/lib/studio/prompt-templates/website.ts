// =============================================================
// Website & Landing Page Templates (5 types)
// Landing Page, Product/Service Page, FAQ Page,
// Comparison Page, Campaign Microsite
// =============================================================

import type { PromptTemplate } from './index';
import { buildBaseSystemPrompt, extractTextSettings, buildContextBlock, formatAdditionalSettings } from './index';

function buildWebsiteUserPrompt(
  userPrompt: string,
  context: import('./index').UserPromptParams['context'],
  settings: import('./index').UserPromptParams['settings'],
  pageGuidance: string,
): string {
  const { tone } = extractTextSettings(settings);
  const contextBlock = buildContextBlock(context);
  const additionalSpecs = formatAdditionalSettings(settings);

  return `${contextBlock}

## PAGE GUIDANCE
${pageGuidance}

## CONTENT SPECIFICATIONS
Tone: ${tone}${additionalSpecs}

## USER PROMPT
${userPrompt}`;
}

export const WEBSITE_TEMPLATES: Record<string, PromptTemplate> = {
  'landing-page': {
    systemPrompt: buildBaseSystemPrompt(
      `You are a conversion-focused landing page copywriter. Create high-converting landing page copy with:
- Hero section: Bold headline (max 10 words), sub-headline (max 25 words), CTA button text
- Problem/Agitation section: Address the visitor's pain points
- Solution section: Present the product/service as the answer
- Benefits section: 3-5 key benefits with icons and short descriptions
- Social proof section: Testimonial placeholders, trust badges, metrics
- FAQ section: 3-5 common objections answered
- Final CTA section: Urgency + value recap + CTA button
- Each section should be clearly labeled with ## headings
- Focus on one single conversion goal per page`,
    ),
    buildUserPrompt: (params) =>
      buildWebsiteUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: Landing page with Hero, Problem, Solution, Benefits, Social Proof, FAQ, and Final CTA sections.',
      ),
  },

  'product-page': {
    systemPrompt: buildBaseSystemPrompt(
      `You are a product/service page copywriter specializing in conversion-optimized web copy. Create compelling product or service page copy with:
- Product/Service headline: Benefit-driven (not feature-driven)
- Value proposition: Clear, concise statement of unique value
- Feature-benefit pairs: 4-6 features with their corresponding benefits
- Use cases or scenarios: 2-3 real-world applications
- Specifications or details: Structured data (pricing, dimensions, availability)
- Trust elements: Guarantee, reviews placeholder, certifications
- CTA: Clear next step (buy, try, contact, demo)
- SEO meta: Title tag (max 60 chars) and meta description (max 155 chars)`,
    ),
    buildUserPrompt: (params) =>
      buildWebsiteUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: Product/service page with headline, value prop, features-benefits, use cases, specs, trust elements, and CTA.',
      ),
  },

  'faq-page': {
    systemPrompt: buildBaseSystemPrompt(
      `You are an FAQ page writer specializing in SEO-optimized question-and-answer content. Create comprehensive FAQ pages with:
- 8-12 frequently asked questions organized by category
- Questions written in natural language (how people actually search)
- Answers that are concise yet complete (50-150 words each)
- Include structured data hints (FAQ schema markup suggestions)
- Link opportunities within answers to relevant pages
- Address both pre-purchase and post-purchase questions
- Include questions that handle common objections
- SEO-optimized: questions should target long-tail keywords`,
    ),
    buildUserPrompt: (params) =>
      buildWebsiteUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: FAQ page with 8-12 Q&As organized by category. Include schema markup hints.',
      ),
  },

  'comparison-page': {
    systemPrompt: buildBaseSystemPrompt(
      `You are a comparison page strategist. Create persuasive "us vs. them" or feature comparison content with:
- Headline that positions the brand favorably without being negative
- Comparison matrix: 6-10 features/criteria with checkmarks/ratings
- Narrative sections explaining key differentiators
- Honest acknowledgment of competitor strengths (builds trust)
- Focus on unique selling points and outcomes, not just features
- Include a "Why choose us" summary section
- CTA that capitalizes on the comparison momentum
- Maintain a professional, confident tone — never disparaging`,
    ),
    buildUserPrompt: (params) =>
      buildWebsiteUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: Comparison page with feature matrix, narrative differentiators, "Why choose us" section, and CTA.',
      ),
  },

  microsite: {
    systemPrompt: buildBaseSystemPrompt(
      `You are a campaign microsite copywriter. Create copy for a dedicated multi-page campaign site with:
- Homepage: Campaign hero, narrative hook, navigation to sub-pages
- About the campaign: Purpose, story, and brand connection
- Content/Resources page: Downloadable assets, videos, tools
- Community/Social proof page: UGC, testimonials, social feeds
- Action/Convert page: Sign-up, purchase, or engagement CTA
- Each page: H1 title, intro paragraph, 2-3 content sections, CTA
- Consistent campaign voice and messaging across all pages
- Navigation structure and page flow suggestions`,
    ),
    buildUserPrompt: (params) =>
      buildWebsiteUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: Multi-page microsite brief. Include copy for 4-5 pages with consistent campaign messaging.',
      ),
  },
};
