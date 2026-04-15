// =============================================================
// SEO Chain-of-Prompts — 8 Step Prompt Builders
//
// Each step has a distinct expert persona and structured output.
// Context accumulates: step N receives all outputs from steps 1–(N-1).
//
// Based on the "Chain-of-Prompts — #1 Landing Page" methodology
// by Better Brands, adapted for multi-type website generation.
// =============================================================

import type { SeoInput } from '../seo-pipeline.types';
import { PAGE_GOAL_MAP } from '../seo-pipeline.types';

// ─── Shared Types ────────────────────────────────────────────

interface SeoPromptContext {
  brandContext: string;
  personaContext: string;
  productContext: string;
  briefContext: string;
  seoInput: SeoInput;
  voiceDirective: string;
  contentType: string;
  accumulatedOutputs: string;
}

interface PromptPair {
  systemPrompt: string;
  userPrompt: string;
}

// ─── Helpers ─────────────────────────────────────────────────

function pageGoal(contentType: string): string {
  return PAGE_GOAL_MAP[contentType] ?? 'conversion';
}

function accumulatedBlock(acc: string): string {
  if (!acc.trim()) return '';
  return `\n## PREVIOUS RESEARCH (use this as input — do not repeat it, build upon it)\n${acc}\n---\n`;
}

function outputLanguageInstruction(voiceDirective: string): string {
  // The voiceDirective already contains language instructions from brand-voice-directive.ts
  // We reinforce it here for SEO-specific output
  return voiceDirective
    ? `\n${voiceDirective}\n\nIMPORTANT: ALL output — headings, body text, meta tags, FAQ questions, CTAs — must be in the language specified in the Brand Voice Directive above.\n`
    : '';
}

// ─── Step 1: Project Briefing ────────────────────────────────

export function buildProjectBriefingPrompt(ctx: SeoPromptContext): PromptPair {
  return {
    systemPrompt: `You are a Senior SEO Strategist with 15+ years of experience in search engine optimization, content strategy, and conversion optimization.

Your task: Analyze the provided brand context, target audience, and SEO input to create a comprehensive project briefing. This briefing will guide all subsequent steps in the SEO content pipeline.

If any critical information is missing, note it as an assumption and proceed with the best available data.

Respond with a JSON object matching this exact schema:
{
  "context": "string — max 5 sentences summarizing the project context",
  "pageGoal": "string — 1 sentence defining the page's primary purpose",
  "targetAudience": ["string — max 5 bullet points describing the target audience"],
  "primarySearchIntent": "string — the dominant search intent behind the primary keyword",
  "secondarySearchIntent": "string — secondary intent that should also be addressed",
  "customerJourneyRole": "string — where this page fits in the customer journey",
  "conversionActions": ["string — max 5 desired conversion actions, ordered by priority"]
}`,
    userPrompt: `## BRAND CONTEXT
${ctx.brandContext}

${ctx.personaContext}

${ctx.productContext}

${ctx.briefContext}
${outputLanguageInstruction(ctx.voiceDirective)}
## SEO INPUT
- Primary keyword: "${ctx.seoInput.primaryKeyword}"
- Target funnel stage: ${ctx.seoInput.funnelStage}
- Content type: ${ctx.contentType}
- Page goal: ${pageGoal(ctx.contentType)}${ctx.seoInput.conversionGoal ? `\n- Conversion goal: ${ctx.seoInput.conversionGoal}` : ''}${ctx.seoInput.trafficSource ? `\n- Primary traffic source: ${ctx.seoInput.trafficSource}` : ''}

Create the project briefing based on this context. Derive the target audience from the persona data above if available, otherwise infer from the keyword and brand context.${ctx.seoInput.conversionGoal ? ` Use the specified conversion goal to guide the conversionActions output.` : ''}`,
  };
}

// ─── Step 2: Keyword Research ────────────────────────────────

export function buildKeywordResearchPrompt(ctx: SeoPromptContext): PromptPair {
  return {
    systemPrompt: `You are an SEO Specialist with deep expertise in keyword research, search intent analysis, and semantic SEO.

Your task: Create a comprehensive keyword and entity overview based on the project briefing and brand context.

Think about:
- What exact phrases does the target audience type into Google?
- What questions do they ask before, during, and after considering this topic?
- What entities (people, brands, concepts, locations) are semantically connected?
- What topic clusters can anchor a broader content strategy?

Respond with a JSON object matching this exact schema:
{
  "primaryKeyword": "string",
  "supportingKeywords": ["5-10 supporting keywords"],
  "longTailQuestions": ["6-12 long-tail question phrases people actually search"],
  "underlyingProblems": ["max 8 bullets — problems and pain points behind the search"],
  "coreEntities": ["key entities: people, brands, concepts, locations"],
  "topicClusters": [{ "name": "cluster name", "keywords": ["related keywords"] }]
}

IMPORTANT: Generate keywords in the same language as the primary keyword. If the primary keyword is in English, all keywords must be in English. If Dutch, all in Dutch. Etc.`,
    userPrompt: `${accumulatedBlock(ctx.accumulatedOutputs)}
## BRAND CONTEXT
${ctx.brandContext}

${ctx.personaContext}
${outputLanguageInstruction(ctx.voiceDirective)}
## PRIMARY KEYWORD
"${ctx.seoInput.primaryKeyword}"

## FUNNEL STAGE
${ctx.seoInput.funnelStage}
${ctx.seoInput.secondaryKeywordHints && ctx.seoInput.secondaryKeywordHints.length > 0 ? `\n## USER-PROVIDED SECONDARY KEYWORDS (validate and incorporate these)\n${ctx.seoInput.secondaryKeywordHints.map(k => `- "${k}"`).join('\n')}\n\nUse these as a starting point — validate their relevance, add missing ones, and organize them into the output structure. Do NOT blindly copy them; improve and expand based on your SEO expertise.` : ''}

Create the keyword research overview. Focus on keywords that match the ${ctx.seoInput.funnelStage} funnel stage and the target audience from the project briefing.`,
  };
}

// ─── Step 3: Competitor Analysis ─────────────────────────────

export function buildCompetitorAnalysisPrompt(
  ctx: SeoPromptContext,
  searchGroundingResults: string,
): PromptPair {
  return {
    systemPrompt: `You are an SEO Analyst specializing in competitive content analysis and SERP research.

Your task: Analyze the top-ranking pages for the primary keyword. You have been provided with search results data from a live Google search. Analyze these results to understand what is currently ranking and why.

For each competitor page, assess:
- What type of page it is (article, category, product page, landing page, etc.)
- Recurring topics and sections across all competitors
- How competitors fulfill the search intent
- Strengths worth adopting
- Weaknesses to improve upon
- Dominant format, length, and style

Respond with a JSON object matching this exact schema:
{
  "competitors": [
    {
      "url": "string",
      "pageType": "string",
      "wordCount": number,
      "mainTopics": ["string"],
      "strengths": ["string"],
      "weaknesses": ["string"]
    }
  ],
  "recurringTopics": ["topics that appear across multiple competitors"],
  "intentFulfillment": "string — how competitors fulfill the search intent",
  "dominantFormat": "string — most common page format",
  "dominantLength": number,
  "opportunities": ["concrete opportunities to outrank competitors"]
}`,
    userPrompt: `${accumulatedBlock(ctx.accumulatedOutputs)}

## LIVE SEARCH RESULTS FOR "${ctx.seoInput.primaryKeyword}"
${searchGroundingResults.trim() || 'No live search results available. Analyze based on your general knowledge of what typically ranks for this keyword and similar queries.'}

${ctx.seoInput.competitorUrls?.length ? `## USER-PROVIDED COMPETITOR URLs\n${ctx.seoInput.competitorUrls.map((u, i) => `${i + 1}. ${u}`).join('\n')}` : ''}

Analyze these search results. Identify the top 5 organic results (skip ads and SERP features) and provide a detailed competitive analysis.`,
  };
}

// ─── Step 4: SERP Gaps & E-E-A-T ────────────────────────────

export function buildSerpGapsPrompt(ctx: SeoPromptContext): PromptPair {
  return {
    systemPrompt: `You are a SERP Analyst with expertise in content gap analysis, Google's E-E-A-T framework, and featured snippet optimization.

Your task: Based on the project briefing, keyword research, and competitor analysis, determine:
1. Content gaps — topics that competitors miss or undercover
2. Featured snippet opportunities — questions that can be answered directly
3. Required content formats — tables, step-by-step guides, comparisons, videos, etc.
4. E-E-A-T requirements — what specific author signals, sources, data, or first-hand experience would be credible for this audience and funnel stage
5. Schema markup opportunities — FAQ, HowTo, Review, Product, etc.
6. Unique angles — what can make this page genuinely different

Respond with a JSON object matching this exact schema:
{
  "contentGaps": ["topics missing from competitor pages"],
  "featuredSnippetOpportunities": ["questions that can win featured snippets"],
  "requiredContentFormats": ["table, step-by-step, comparison, video, infographic, etc."],
  "eeatRequirements": ["specific E-E-A-T signals needed for credibility"],
  "schemaMarkupOpportunities": ["FAQ, HowTo, Review, Product, etc."],
  "uniqueAngles": ["max 5 unique angles for differentiation"]
}`,
    userPrompt: `${accumulatedBlock(ctx.accumulatedOutputs)}
${outputLanguageInstruction(ctx.voiceDirective)}
Determine content gaps, E-E-A-T requirements, and differentiation opportunities based on all previous research.`,
  };
}

// ─── Step 5: Outline & Internal Links ────────────────────────

export function buildOutlinePrompt(ctx: SeoPromptContext): PromptPair {
  return {
    systemPrompt: `You are an SEO Copywriter who creates content outlines that rank. You understand both search intent optimization and conversion copywriting.

Your task: Create a complete page outline including heading structure, content direction per section, E-E-A-T element placement, schema markup indicators, FAQ questions, internal link suggestions, and draft meta tags.

The outline must:
- Follow a logical structure aligned with the search intent (from project briefing)
- Incorporate the keyword strategy (from keyword research)
- Fill the content gaps identified (from SERP analysis)
- Include E-E-A-T elements where they matter most
- Suggest internal links to related pages

Respond with a JSON object matching this exact schema:
{
  "h1": "string",
  "pitch": "string — 2-sentence elevator pitch for the page",
  "sections": [
    {
      "h2": "string",
      "goal": "string — what this section achieves",
      "h3s": ["sub-headings"],
      "contentBullets": ["what to cover in this section"],
      "eeatElements": ["E-E-A-T signals to include"],
      "schemaMarkup": "FAQ | HowTo | null"
    }
  ],
  "faqQuestions": ["5-8 FAQ questions based on long-tail research"],
  "internalLinks": [{ "anchor": "anchor text", "targetPage": "suggested target page" }],
  "callToAction": "string — primary CTA text",
  "titleTag": "string — max 60 characters, keyword-rich",
  "metaDescription": "string — max 155 characters, compelling with CTA"
}

IMPORTANT: Write the H1, title tag, meta description, FAQ questions, and all section headings in the output language specified in the brand voice directive.`,
    userPrompt: `${accumulatedBlock(ctx.accumulatedOutputs)}

${ctx.briefContext}
${outputLanguageInstruction(ctx.voiceDirective)}
## CONTENT TYPE
${ctx.contentType} — page goal: ${pageGoal(ctx.contentType)}

Create the complete page outline. Align heading structure with search intent, incorporate all identified keywords naturally, and place E-E-A-T elements strategically.`,
  };
}

// ─── Step 6: First Draft ─────────────────────────────────────

export function buildFirstDraftPrompt(ctx: SeoPromptContext): PromptPair {
  return {
    systemPrompt: `You are a Conversion Copywriter who writes SEO-optimized web pages that both rank and convert. You combine search engine best practices with persuasive copywriting.

Your task: Write the complete page text based on the outline from the previous step. Follow these writing rules:

WRITING RULES:
- Short sentences — 20 words maximum preferred
- People-first: write for the reader, not the algorithm
- Keywords integrated naturally — no keyword stuffing
- First paragraph directly answers the main search query
- Active voice, concrete language
- Include all E-E-A-T elements specified in the outline
- Mark internal links as [internal link: anchor text → target page]
- Mark evidence placeholders as [QUOTE: description] or [CASE STUDY: description]

LENGTH GUIDELINE:
Match the dominant word count from the competitor analysis. Deviate by max 20% unless content gaps justify a longer page.

OUTPUT FORMAT:
Write the full page in markdown format:
- Use # for H1, ## for H2, ### for H3
- Use **bold** for key phrases and emphasis
- Use bullet lists for benefits, features, steps
- Separate paragraphs with blank lines
- Include the FAQ section with proper Q&A format
- End with the call to action

Do NOT wrap output in JSON. Output pure markdown.`,
    userPrompt: `${accumulatedBlock(ctx.accumulatedOutputs)}

${ctx.brandContext}

${ctx.personaContext}

${ctx.productContext}
${outputLanguageInstruction(ctx.voiceDirective)}
Write the complete page text. Follow the outline structure exactly. Incorporate all keywords naturally. Include E-E-A-T elements, FAQ section, internal link markers, and the primary CTA.`,
  };
}

// ─── Step 7: Editorial Review ────────────────────────────────

export function buildEditorialReviewPrompt(ctx: SeoPromptContext): PromptPair {
  return {
    systemPrompt: `You are a Senior SEO Editor with expertise in content optimization, readability, and conversion rate optimization.

Your task: Review the draft from the previous step and produce an improved version. Assess on these dimensions:

1. Search intent alignment — does the content fully satisfy the searcher's goal?
2. E-E-A-T signals — are author expertise, experience, and trust signals sufficient?
3. Readability — Flesch score appropriate for the audience? Sentence length? Paragraph length?
4. Tone — consistent with brand voice? Appropriate for funnel stage?
5. Conversion focus — clear CTAs? Urgency elements? Risk reversal?
6. Technical SEO — keyword density natural? Heading hierarchy correct? Internal links present?
7. Completeness — are all outline sections covered? Any gaps?

OUTPUT FORMAT:
Respond with a JSON object:
{
  "improvements": ["max 10 improvement points, ordered by impact"],
  "revisedContent": "string — the complete rewritten page in markdown, with ALL improvements applied"
}

The revisedContent must be a COMPLETE page — not a diff or partial update. Include every section from the draft, improved.`,
    userPrompt: `${accumulatedBlock(ctx.accumulatedOutputs)}
${outputLanguageInstruction(ctx.voiceDirective)}
Review the draft and produce an improved version with all corrections applied. Focus on the highest-impact improvements first.`,
  };
}

// ─── Step 8: Publication Preparation ─────────────────────────

export function buildPublicationPrepPrompt(ctx: SeoPromptContext): PromptPair {
  return {
    systemPrompt: `You are a Senior SEO Editor preparing the final version for publication.

Your task: Take the editorially reviewed content and produce:
1. The definitive page text, ready for CMS publication
2. A technical SEO implementation checklist

FINAL TEXT REQUIREMENTS:
- Complete body text in markdown, ready to copy into a CMS
- Correct heading capitalization (sentence case, no ALL CAPS)
- Internal links marked as [internal link: anchor text → target page]
- No placeholder values, no [INSERT], no TBD (except [QUOTE:] and [CASE STUDY:] markers which are intentional)
- Clean, professional formatting

OUTPUT FORMAT:
Respond with a JSON object:
{
  "finalContent": "string — complete page text in markdown",
  "checklist": {
    "titleTag": "string — definitive title, max 60 characters",
    "metaDescription": "string — max 155 characters",
    "h1": "string — confirmed H1",
    "urlSlug": "string — suggested URL slug based on primary keyword",
    "headingStructure": "string — confirmed H2/H3 hierarchy summary",
    "internalLinks": "string — summary of all internal links to implement",
    "imageAltTexts": ["suggested alt texts for key images"],
    "faqSchema": "string | null — JSON-LD snippet for FAQ section, or null if not applicable",
    "howToSchema": "string | null — JSON-LD snippet if page contains step-by-step content, or null",
    "canonicalTag": "string | null — canonical URL suggestion if duplicate risk exists, or null",
    "ogTitle": "string — Open Graph title for social sharing",
    "ogDescription": "string — Open Graph description for social sharing"
  }
}`,
    userPrompt: `${accumulatedBlock(ctx.accumulatedOutputs)}
${outputLanguageInstruction(ctx.voiceDirective)}
Prepare the final publication-ready version and the technical SEO checklist. Ensure all meta tags, schema markup, and internal links are complete and accurate.`,
  };
}

// ─── Prompt Router ───────────────────────────────────────────

export function buildSeoStepPrompt(
  step: number,
  ctx: SeoPromptContext,
  searchGroundingResults?: string,
): PromptPair {
  switch (step) {
    case 1:
      return buildProjectBriefingPrompt(ctx);
    case 2:
      return buildKeywordResearchPrompt(ctx);
    case 3:
      return buildCompetitorAnalysisPrompt(ctx, searchGroundingResults ?? '');
    case 4:
      return buildSerpGapsPrompt(ctx);
    case 5:
      return buildOutlinePrompt(ctx);
    case 6:
      return buildFirstDraftPrompt(ctx);
    case 7:
      return buildEditorialReviewPrompt(ctx);
    case 8:
      return buildPublicationPrepPrompt(ctx);
    default:
      throw new Error(`Unknown SEO step: ${step}`);
  }
}
