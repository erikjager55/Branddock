// =============================================================
// Trend Analysis AI Prompts
//
// System + user prompt templates for AI-powered trend detection
// from scraped website content via Gemini.
//
// Modes:
//   1. Query generation (diverse search queries)
//   2. Signal extraction (per-source structured data extraction)
//   3. Trend synthesis (cross-source trend identification from signals)
//   4. Judge validation (LLM-as-Judge quality control)
//   5. Single-source analysis (legacy/cron)
// =============================================================

import type { BrandContextBlock } from '../prompt-templates';

/** Build brand context block shared by all prompt builders. */
function buildBrandContextBlock(brandContext?: BrandContextBlock): string {
  if (!brandContext) return '';

  const parts: string[] = [];
  if (brandContext.brandName) parts.push(`Brand: ${brandContext.brandName}`);
  if (brandContext.brandMission) parts.push(`Mission: ${brandContext.brandMission}`);
  if (brandContext.brandVision) parts.push(`Vision: ${brandContext.brandVision}`);
  if (brandContext.brandValues?.length) parts.push(`Values: ${brandContext.brandValues.join(', ')}`);
  if (brandContext.targetAudience) parts.push(`Target Audience: ${brandContext.targetAudience}`);
  if (brandContext.productsOverview) parts.push(`Products: ${brandContext.productsOverview}`);
  if (brandContext.competitiveLandscape) parts.push(`Competitive Landscape: ${brandContext.competitiveLandscape}`);

  if (parts.length === 0) return '';
  return `\n\n## Brand Context\n${parts.join('\n')}`;
}

// ─── Phase 1: Query Generation ──────────────────────────────

/**
 * Build prompt for generating diverse search queries from a base query.
 * Used by query-generator.ts to produce 5-7 varied search angles.
 */
export function buildQueryGenerationPrompt(
  baseQuery: string,
  brandContext?: BrandContextBlock,
): string {
  const ctx = buildBrandContextBlock(brandContext);
  const currentYear = new Date().getFullYear();

  return `Generate 7 diverse web search queries to research this topic from multiple angles: "${baseQuery}"

Today's date: ${new Date().toISOString().slice(0, 10)}

Each query should approach the topic from a DIFFERENT perspective to maximize source diversity. Use a MIX of source types — do NOT let any single type dominate:

1. **Growth signals**: market size, adoption rates, growth percentages, statistics
2. **Investment/startup**: funding rounds, venture capital, new companies, M&A activity
3. **Problem-oriented**: challenges, pain points, regulations, barriers, criticism
4. **Expert analysis**: forecasts, predictions, analyst opinions, research reports
5. **Cross-domain**: intersection with consumer behavior, technology, or adjacent industries
6. **Contrarian/critical**: limitations, backlash, alternatives, skepticism
7. **Niche sub-topic**: drill into a specific sub-niche or micro-segment within the topic${ctx}

## Query Guidelines
- Each query: 5-15 words, optimized for Google Search
- Add the year (${currentYear}) only when recency is critical for that angle (e.g. statistics, funding rounds, new regulations). Do NOT add a year to every query.
- At least 2 queries should NOT contain any year — to capture evergreen analysis and cross-domain perspectives
- Be specific — avoid overly broad queries that return only generic results
- Vary the source types you target: industry reports, academic, news, trade publications, government data

Return ONLY a JSON array of 7 query strings.

Example: ["sustainable packaging market growth statistics ${currentYear}", "sustainable packaging startup funding rounds", "bioplastics adoption challenges food industry", ...]`;
}

// ─── Phase 2: Signal Extraction ─────────────────────────────

/**
 * Build prompt for extracting structured signals from scraped content.
 * Used by signal-extractor.ts to pull facts from a single source.
 */
export function buildSignalExtractionPrompt(
  sourceUrl: string,
  sourceName: string,
  content: string,
): string {
  // Truncate content to ~12k chars per source
  const trimmed = content.slice(0, 12_000);

  return `Extract all noteworthy data points, statistics, claims, shifts, and named entities from this web content.

Source: "${sourceName}"
URL: ${sourceUrl}

## Content
${trimmed}

## Instructions
Focus on extracting:
- Concrete numbers, growth/decline percentages, market sizes, adoption rates
- Company moves, product launches, strategic shifts, M&A activity
- Regulatory changes, new policies, compliance requirements
- Consumer behavior shifts, sentiment changes, demographic trends
- Expert quotes, forecasts, predictions with attribution
- Technology developments, innovation milestones

Do NOT interpret or theorize — only extract structured facts with their evidence.
Dismiss promotional content, product announcements, and PR claims unless backed by independent third-party data.
Extract the publication or last-updated date if visible in the content.

## Output Format
Return valid JSON only:
{
  "signals": [
    {
      "claim": "Concise statement of the finding (1-2 sentences)",
      "evidence": "The specific quote, statistic, or data point that supports this claim",
      "dataPoints": ["24% YoY growth", "€2.4B market size"],
      "entities": ["European Bioplastics Association", "TotalEnergies"],
      "sourceType": "news" | "research" | "industry_report" | "blog" | "analysis" | "government" | "other",
      "publicationDate": "2026-01-15" or "unknown",
      "sourceAuthority": "major_publication" | "industry_specialist" | "company_blog" | "general" | "unknown"
    }
  ]
}

Extract 3-8 signals. Quality over quantity — only include claims backed by concrete evidence.`;
}

// ─── Phase 3: Trend Synthesis ───────────────────────────────

const SYNTHESIS_JSON_SCHEMA = `{
  "trends": [
    {
      "title": "Specific, insight-driven trend title (max 100 chars)",
      "description": "3-4 sentences with embedded data points, cross-referenced across sources. Cite specific evidence.",
      "whyNow": "1-2 sentences explaining what changed that makes this relevant RIGHT NOW — the catalyst or inflection point",
      "category": "CONSUMER_BEHAVIOR" | "TECHNOLOGY" | "MARKET_DYNAMICS" | "COMPETITIVE" | "REGULATORY",
      "scope": "MICRO" | "MESO" | "MACRO",
      "impactLevel": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "timeframe": "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM",
      "direction": "rising" | "declining" | "stable",
      "confidence": 50-100,
      "supportingSignalIndices": [0, 3, 7],
      "sourceUrls": ["url1", "url2"],
      "primarySourceUrl": "url_of_strongest_source",
      "dataPoints": ["24% YoY growth", "€2.4B market"],
      "evidenceCount": 3,
      "rawExcerpt": "The strongest evidence quote verbatim from sources",
      "industries": ["industry1", "industry2"],
      "tags": ["tag1", "tag2", "tag3"],
      "howToUse": [
        "Specific, actionable step with concrete deliverable, timeline, and measurable outcome",
        "Another concrete recommendation"
      ]
    }
  ]
}`;

/**
 * Build the system prompt for signal-based trend synthesis.
 * Takes pre-extracted signals (not raw content) for higher quality synthesis.
 */
export function buildSynthesisSystemPrompt(brandContext?: BrandContextBlock): string {
  const ctx = buildBrandContextBlock(brandContext);

  return `You are a senior strategic trend analyst producing boardroom-quality trend intelligence.

Your task: synthesize pre-extracted research signals from multiple web sources into emerging trends. The signals have already been fact-extracted — your job is to find patterns, cross-reference, and identify what matters.${ctx}

## Quality Standards

### Specificity is EVERYTHING
Each trend title must name a SPECIFIC shift — not a broad category. Test: could a senior strategist read only the title and immediately understand what changed?

BAD TREND: "Companies are adopting AI" — too generic, everyone knows this
GOOD TREND: "Mid-market B2B SaaS companies replacing traditional onboarding with AI-guided setup wizards, reducing time-to-value by 40-60%" — specific shift, specific audience, specific metric

If a trend could apply to ANY industry without modification, it is too generic — reject it.

### Evidence & Clustering
- Each trend must represent a GENUINE shift — not common knowledge or obvious statements
- Cluster related signals from different sources into single, comprehensive trends
- A trend backed by 3+ independent sources is STRONG — assign confidence 80-100
- A trend backed by 2 sources is MODERATE — confidence 65-80
- A trend from 1 source only is WEAK — only include if evidence is exceptional from a major publication (confidence 50-65)
- PREFER trends corroborated by multiple independent sources over single-source trends
- Weight signals from authoritative sources (major_publication, industry_specialist) more heavily
- Each trend description MUST include at least one concrete data point from the signals
- Include ALL source URLs that contributed to the trend in the "sourceUrls" array — this is critical for evidence tracking

### "Why Now?" Requirement
Every trend MUST answer: what has CHANGED that makes this relevant RIGHT NOW? Include a "whyNow" field (1-2 sentences) explaining the catalyst or inflection point.

### Actionable Recommendations
- Each trend MUST include at least 1 specific, actionable "howToUse" recommendation
- Each recommendation MUST contain a concrete deliverable, a timeline, and a measurable outcome
- "howToUse" MUST be specific — NOT "stay informed", "monitor developments", or "keep an eye on"
- Good howToUse example: "Develop a bio-based packaging pilot for top 3 SKUs by Q3 2026, targeting 15% cost reduction"
- Bad howToUse example: "Consider exploring sustainable packaging options"

### Volume
- Fewer, deeper trends are always better than many shallow observations
- Maximum 8 trends — aim for 4-6 high-quality ones

## Scope & Impact Guidelines
- Scope: MICRO = company/product level, MESO = industry level, MACRO = market/societal level
- Impact: CRITICAL = requires immediate strategic response, HIGH = plan within months, MEDIUM = monitor actively, LOW = awareness only
- Timeframe: SHORT_TERM = 0-6 months, MEDIUM_TERM = 6-18 months, LONG_TERM = 18+ months

## Output Format
Respond with valid JSON only. No markdown, no explanation outside the JSON.
${SYNTHESIS_JSON_SCHEMA}`;
}

/**
 * Build the user prompt for signal-based synthesis.
 * Includes numbered signals for cross-referencing.
 */
export function buildSynthesisUserPrompt(params: {
  query: string;
  signals: Array<{
    index: number;
    claim: string;
    evidence: string;
    dataPoints: string[];
    entities: string[];
    sourceUrl: string;
    sourceName: string;
    sourceType: string;
    sourceAuthority?: string;
    publicationDate?: string | null;
  }>;
  sourceCount: number;
}): string {
  const parts: string[] = [
    `Research Query: "${params.query}"`,
    `Today's date: ${new Date().toISOString().slice(0, 10)}`,
    '',
    `The following ${params.signals.length} signals were extracted from ${params.sourceCount} diverse web sources.`,
    'Identify emerging trends by clustering related signals across sources.',
    'Weight signals from authoritative sources (major_publication, industry_specialist) more heavily than company blogs or general sources.',
    '',
  ];

  for (const signal of params.signals) {
    const authorityTag = signal.sourceAuthority && signal.sourceAuthority !== 'unknown'
      ? ` | authority: ${signal.sourceAuthority}`
      : '';
    const dateTag = signal.publicationDate && signal.publicationDate !== 'unknown'
      ? ` | published: ${signal.publicationDate}`
      : '';
    parts.push(`── Signal #${signal.index} (${signal.sourceName} [${signal.sourceType}${authorityTag}${dateTag}]) ──`);
    parts.push(`Claim: ${signal.claim}`);
    if (signal.evidence) parts.push(`Evidence: ${signal.evidence}`);
    if (signal.dataPoints.length > 0) parts.push(`Data: ${signal.dataPoints.join(' | ')}`);
    if (signal.entities.length > 0) parts.push(`Entities: ${signal.entities.join(', ')}`);
    parts.push(`URL: ${signal.sourceUrl}`);
    parts.push('');
  }

  parts.push('Synthesize these signals into emerging trends. For each trend, reference which signal numbers support it via "supportingSignalIndices". Trends supported by 2+ independent sources should receive higher confidence. Return JSON only.');

  return parts.join('\n');
}

// ─── Phase 5: Judge Validation ──────────────────────────────

/**
 * Build the system prompt for the LLM-as-Judge validation step.
 * Critically evaluates candidate trends for quality, novelty, and actionability.
 */
export function buildJudgeSystemPrompt(brandContext?: BrandContextBlock): string {
  const ctx = buildBrandContextBlock(brandContext);

  return `You are a critical senior analyst reviewing trend intelligence produced by a junior analyst. Your job is strict quality control — only boardroom-ready trends should pass. Default to REJECT if uncertain. Only APPROVE trends that would genuinely surprise a competent industry professional.${ctx}

For EACH candidate trend, evaluate:

1. NOVELTY (score 0-100):
   - Would a competent professional in this industry already know this?
   - Has this been widely reported in mainstream business media for > 12 months?
   - Is this an obvious/trivial observation anyone could make?
   - Score 80+: genuinely surprising or emerging insight
   - Score 50-80: somewhat known but with new data/angle
   - Score <50: common knowledge, REJECT

2. GROWTH SIGNAL (score 0-100):
   - Is there evidence this is accelerating, not just existing?
   - Are there concrete growth metrics (% increase, adoption rates)?
   - Score 80+: clear acceleration with data
   - Score 50-80: likely growing but limited data
   - Score <50: no growth evidence

3. STRATEGIC RELEVANCE (score 0-100):
   - How directly does this affect the brand's industry and audience?
   - Can the brand realistically act on this within 12 months?
   - Score 80+: directly impacts brand's core business
   - Score 50-80: relevant to adjacent areas
   - Score <50: tangential, REJECT

4. SPECIFICITY (score 0-100):
   - Score 80+: names specific companies, technologies, or behaviors
   - Score 50-80: describes a specific shift but lacks named examples
   - Score <50: could apply to any industry — REJECT

5. VERDICT:
   - "APPROVE": meets all quality bars (no score below 45)
   - "IMPROVE": good insight but description, howToUse, or title need improvement
   - "REJECT": too generic, too obvious, or insufficient evidence

Flag any data points that appear fabricated or cannot be verified from the provided evidence.

## Output Format
Return valid JSON only:
{
  "judgements": [
    {
      "trendIndex": 0,
      "novelty": 75,
      "growthSignal": 80,
      "strategicRelevance": 65,
      "specificity": 70,
      "verdict": "APPROVE" | "IMPROVE" | "REJECT",
      "reasoning": "1 sentence explaining the verdict",
      "improvedDescription": "Only if verdict is IMPROVE — rewritten description with stronger evidence",
      "improvedHowToUse": ["Only if verdict is IMPROVE — more specific, actionable recommendations"],
      "improvedTitle": "Only if verdict is IMPROVE and title is too vague — more specific title"
    }
  ]
}`;
}

/**
 * Build user prompt for the judge with candidate trends.
 */
export function buildJudgeUserPrompt(
  trends: Array<{
    index: number;
    title: string;
    description: string;
    dataPoints: string[];
    evidenceCount: number;
    howToUse: string[];
    category: string;
    impactLevel: string;
  }>,
): string {
  const parts: string[] = [
    `Review the following ${trends.length} candidate trends for quality, novelty, and actionability.`,
    'Be STRICT — reject anything that is common knowledge, poorly evidenced, or not actionable.',
    '',
  ];

  for (const t of trends) {
    parts.push(`── Trend #${t.index}: "${t.title}" ──`);
    parts.push(`Category: ${t.category} | Impact: ${t.impactLevel}`);
    parts.push(`Description: ${t.description}`);
    if (t.dataPoints.length > 0) parts.push(`Data Points: ${t.dataPoints.join(' | ')}`);
    parts.push(`Evidence sources: ${t.evidenceCount}`);
    if (t.howToUse.length > 0) parts.push(`Recommendations: ${t.howToUse.join(' | ')}`);
    parts.push('');
  }

  parts.push('Evaluate each trend. Return JSON only.');
  return parts.join('\n');
}

// ─── Legacy: Single-source analysis (cron/source-scan) ──────

const LEGACY_JSON_SCHEMA = `{
  "trends": [
    {
      "title": "Specific, insight-driven trend title (max 100 chars)",
      "description": "3-4 sentences with concrete data points, statistics, named examples.",
      "category": "CONSUMER_BEHAVIOR" | "TECHNOLOGY" | "MARKET_DYNAMICS" | "COMPETITIVE" | "REGULATORY",
      "scope": "MICRO" | "MESO" | "MACRO",
      "impactLevel": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "timeframe": "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM",
      "relevanceScore": 50-100,
      "direction": "rising" | "declining" | "stable",
      "confidence": 50-100,
      "sourceUrl": "The URL of the primary source",
      "rawExcerpt": "The exact sentence or paragraph from a source that best supports this trend",
      "industries": ["industry1", "industry2"],
      "tags": ["tag1", "tag2", "tag3"],
      "howToUse": [
        "Specific, actionable recommendation with concrete steps",
        "Another recommendation"
      ]
    }
  ]
}`;

const LEGACY_DETECTION_GUIDELINES = `## Detection Guidelines
- Only extract GENUINE trends — shifts, movements, emerging patterns backed by evidence
- Skip: press releases, product announcements, job postings, event notices, company PR, advertorials
- Skip: obvious/well-known facts, generic industry observations, truisms everyone knows
- Each trend MUST have supporting evidence (rawExcerpt) from at least one source
- Scope: MICRO = company/product level, MESO = industry level, MACRO = market/societal level
- Impact: CRITICAL = requires immediate strategic response, HIGH = plan within months, MEDIUM = monitor actively, LOW = awareness only
- Timeframe: SHORT_TERM = 0-6 months, MEDIUM_TERM = 6-18 months, LONG_TERM = 18+ months
- relevanceScore: 50-70 = useful context, 70-85 = strategically relevant, 85-100 = critical for brand`;

/**
 * Build the system prompt for single-source trend detection.
 * Used by the cron/source-scan flow (per-URL analysis).
 */
export function buildTrendAnalysisSystemPrompt(brandContext?: BrandContextBlock): string {
  const ctx = buildBrandContextBlock(brandContext);

  return `You are a senior trend analyst specializing in brand strategy, competitive intelligence and market foresight.

Your task: detect emerging trends from website content. Identify only NEW, specific trends — not general knowledge or obvious facts.${ctx}

## Output Format
Respond with valid JSON only. No markdown, no explanation outside the JSON.
${LEGACY_JSON_SCHEMA}

${LEGACY_DETECTION_GUIDELINES}
- Maximum 5 trends per source — quality over quantity`;
}

/** Build the user prompt for single-source analysis (legacy/cron). */
export function buildTrendAnalysisUserPrompt(params: {
  sourceName: string;
  sourceUrl: string;
  newContent: string;
  previousContentSummary?: string;
}): string {
  const parts: string[] = [
    `Source: "${params.sourceName}" (${params.sourceUrl})`,
    '',
    '## Content',
    params.newContent.slice(0, 8000),
  ];

  if (params.previousContentSummary) {
    parts.push('', '## Previous Content Summary (for comparison)');
    parts.push(params.previousContentSummary.slice(0, 2000));
  }

  parts.push('', 'Detect any emerging trends from this content. Return JSON only.');

  return parts.join('\n');
}

// ─── Legacy: Multi-source (kept for backward compat) ────────

/**
 * Build the system prompt for multi-source trend synthesis.
 * @deprecated Use buildSynthesisSystemPrompt for signal-based synthesis.
 */
export function buildMultiSourceSystemPrompt(brandContext?: BrandContextBlock): string {
  const ctx = buildBrandContextBlock(brandContext);

  return `You are a senior strategic trend analyst producing boardroom-quality trend intelligence. You have deep expertise in brand strategy, competitive intelligence, market foresight, and consumer behavior.

Your task: synthesize insights from MULTIPLE web sources to identify significant emerging trends. Cross-reference information across sources, identify converging patterns, and deliver deep, evidence-backed strategic insights.${ctx}

## Quality Standards
- Each trend must represent a GENUINE shift — not common knowledge or obvious statements
- Prioritize trends backed by specific data points, statistics, percentages, or named examples
- When multiple sources mention related topics, MERGE them into a single, richer trend
- Each trend description MUST include at least one concrete data point, number, or named example
- "howToUse" must be actionable and specific — not generic advice like "stay informed" or "monitor developments"
- Fewer, deeper trends are always better than many shallow observations
- A great trend answers: "What is changing? What evidence proves it? Why does it matter strategically?"

## Output Format
Respond with valid JSON only. No markdown, no explanation outside the JSON.
${LEGACY_JSON_SCHEMA}

${LEGACY_DETECTION_GUIDELINES}
- Maximum 10 trends total across all sources — quality over quantity
- Merge related observations from different sources into single, comprehensive trends`;
}

/**
 * Build the user prompt for multi-source analysis.
 * @deprecated Use buildSynthesisUserPrompt for signal-based synthesis.
 */
export function buildMultiSourceUserPrompt(params: {
  query: string;
  sources: Array<{ name: string; url: string; content: string }>;
}): string {
  const totalBudget = 50_000;
  const perSourceBudget = Math.floor(totalBudget / Math.max(params.sources.length, 1));

  const parts: string[] = [
    `Research Query: "${params.query}"`,
    '',
    `Analyze the following ${params.sources.length} web sources to identify emerging trends.`,
    `Cross-reference information across sources — trends mentioned by multiple sources deserve higher confidence.`,
    '',
  ];

  for (let i = 0; i < params.sources.length; i++) {
    const src = params.sources[i];
    parts.push(`═══ Source ${i + 1} of ${params.sources.length}: "${src.name}" ═══`);
    parts.push(`URL: ${src.url}`);
    parts.push('');
    parts.push(src.content.slice(0, perSourceBudget));
    parts.push('');
  }

  parts.push('Synthesize trends across ALL sources above. Identify converging patterns. For each trend, set "sourceUrl" to the URL of the primary source it was detected from. Return JSON only.');

  return parts.join('\n');
}
