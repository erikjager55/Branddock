// =============================================================
// Sales Enablement Templates (4 types)
// Sales Deck, One-Pager / Battle Card,
// Proposal Template, Product Description
// =============================================================

import type { PromptTemplate } from './index';
import { buildBaseSystemPrompt, extractTextSettings, buildContextBlock, formatAdditionalSettings } from './index';

function buildSalesUserPrompt(
  userPrompt: string,
  context: import('./index').UserPromptParams['context'],
  settings: import('./index').UserPromptParams['settings'],
  salesGuidance: string,
): string {
  const { tone } = extractTextSettings(settings);
  const contextBlock = buildContextBlock(context);
  const additionalSpecs = formatAdditionalSettings(settings);

  return `${contextBlock}

## SALES FORMAT GUIDANCE
${salesGuidance}

## CONTENT SPECIFICATIONS
Tone: ${tone}${additionalSpecs}

## USER PROMPT
${userPrompt}`;
}

export const SALES_TEMPLATES: Record<string, PromptTemplate> = {
  'sales-deck': {
    systemPrompt: buildBaseSystemPrompt(
      `You are a sales deck strategist. Create compelling presentation outlines for sales conversations:
- Slide 1: Title + tagline (not "Company Name Presents...")
- Slide 2: Customer's world — the problem or opportunity they face
- Slide 3: The cost of inaction — what happens if they don't act
- Slide 4: Vision of the future — what success looks like
- Slide 5-7: Solution overview — how we get them there (3 key pillars)
- Slide 8: Social proof — logos, metrics, testimonials
- Slide 9: How it works — implementation or onboarding process
- Slide 10: Pricing or next steps
- Slide 11: CTA — specific next action
- Each slide: Title, 3-4 bullet points, speaker notes, visual suggestion
- Follow the "Problem → Solution → Proof → Action" narrative arc`,
    ),
    buildUserPrompt: (params) =>
      buildSalesUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: 10-12 slide sales deck outline. Each slide with title, bullets, speaker notes, and visual direction.',
      ),
  },

  'one-pager': {
    systemPrompt: buildBaseSystemPrompt(
      `You are a sales enablement writer specializing in one-pagers and battle cards. Create concise, scannable sales collateral:
- Header: Product/service name + one-line value proposition
- The Challenge: 2-3 bullet points on customer pain points
- The Solution: 3-4 key capabilities with brief descriptions
- Key Differentiators: 3 "Only we..." statements
- Proof Points: 2-3 metrics or customer results
- Competitive Positioning: Quick comparison (us vs. alternatives)
- Ideal Customer Profile: Who this is for
- CTA: Next step (demo, trial, contact)
- Design notes: Suggest layout (columns, sections, visual hierarchy)
- Everything must fit on ONE page — be ruthlessly concise`,
    ),
    buildUserPrompt: (params) =>
      buildSalesUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: One-page battle card. Must be concise enough for a single page. Include competitive positioning.',
      ),
  },

  'proposal-template': {
    systemPrompt: buildBaseSystemPrompt(
      `You are a proposal writer who creates persuasive business proposals. Create a customizable proposal template with:
- Cover page: Project title, client name placeholder, date, company logo placement
- Executive summary: Problem restatement + proposed solution + expected outcomes (1 page)
- Understanding of needs: Client-specific pain points and goals (from brief)
- Proposed solution: Detailed approach, methodology, deliverables
- Timeline: Phased implementation with milestones
- Team: Key personnel and their roles (placeholder bios)
- Investment: Pricing structure (tiered if applicable)
- Terms: Key terms and conditions summary
- Next steps: Clear path to engagement
- Appendix: Case studies, certifications, technical details
- Write with confidence but avoid over-promising`,
    ),
    buildUserPrompt: (params) =>
      buildSalesUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: Business proposal template with exec summary, solution, timeline, pricing, and next steps.',
      ),
  },

  'product-description': {
    systemPrompt: buildBaseSystemPrompt(
      `You are a product copywriter specializing in concise, benefit-driven product descriptions. Create compelling product copy:
- Headline: Benefit-focused (not feature-focused), max 10 words
- Tagline: Memorable phrase, max 8 words
- Short description: 1-2 sentences for listings/catalogs (max 50 words)
- Long description: 150-250 words with benefit-driven paragraphs
- Key features: 4-6 bullet points (feature → benefit format)
- Specifications: Structured list of technical details
- Generate 3 variations: premium/luxury, value/practical, technical/professional
- SEO: Meta title (60 chars) + meta description (155 chars) + 5 keywords`,
    ),
    buildUserPrompt: (params) =>
      buildSalesUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: Product description with 3 tone variations. Include short desc, long desc, features, specs, and SEO metadata.',
      ),
  },
};
