import { prisma } from '@/lib/prisma';
import { getBrandContext } from '@/lib/ai/brand-context';
import { formatBrandContext } from '@/lib/ai/prompt-templates';
import type { ContextSelection, ContextModule, ClawAttachment, ClawPageContext } from './claw.types';

const MAX_CONTEXT_TOKENS_ESTIMATE = 12_000;
const AVG_CHARS_PER_TOKEN = 4;
const MAX_CONTEXT_CHARS = MAX_CONTEXT_TOKENS_ESTIMATE * AVG_CHARS_PER_TOKEN;

/**
 * Build the system prompt for the Claw assistant.
 * Assembles brand context from selected modules + attachments.
 */
export async function assembleSystemPrompt(
  workspaceId: string,
  selection: ContextSelection,
  attachments?: ClawAttachment[],
  pageContext?: ClawPageContext,
): Promise<{ systemPrompt: string; estimatedTokens: number }> {
  const sections: string[] = [];

  // ── Identity ─────────────────────────────────────────────
  sections.push(SYSTEM_IDENTITY);

  // ── Current Page (so the AI knows where the user is) ─────
  if (pageContext) {
    sections.push(formatPageContext(pageContext));
  }

  // ── Brand context (compact, always included) ─────────────
  if (selection.modules.includes('brand_assets') || selection.modules.includes('brandstyle')) {
    const brandCtx = await getBrandContext(workspaceId);
    const formatted = formatBrandContext(brandCtx);
    sections.push(formatted);
  }

  // ── Per-module detailed context ──────────────────────────
  const modulePromises: Promise<string | null>[] = [];

  for (const mod of selection.modules) {
    const entityIds = selection.entityIds?.[mod];
    modulePromises.push(fetchModuleContext(workspaceId, mod, entityIds));
  }

  const moduleResults = await Promise.all(modulePromises);
  for (const result of moduleResults) {
    if (result) sections.push(result);
  }

  // ── Attachments ──────────────────────────────────────────
  if (attachments?.length) {
    const attachmentSection = formatAttachments(attachments);
    sections.push(attachmentSection);
  }

  // ── Assemble + truncate ──────────────────────────────────
  let systemPrompt = sections.join('\n\n---\n\n');

  if (systemPrompt.length > MAX_CONTEXT_CHARS) {
    systemPrompt = systemPrompt.slice(0, MAX_CONTEXT_CHARS) + '\n\n[Context truncated due to size limit]';
  }

  const estimatedTokens = Math.ceil(systemPrompt.length / AVG_CHARS_PER_TOKEN);

  return { systemPrompt, estimatedTokens };
}

/**
 * Estimate token count for a context selection (for UI indicator).
 */
export function estimateContextTokens(
  moduleCount: number,
  attachmentChars: number
): number {
  const baseTokens = 400; // system identity
  const perModuleTokens = 800; // average per module
  const attachmentTokens = Math.ceil(attachmentChars / AVG_CHARS_PER_TOKEN);
  return baseTokens + moduleCount * perModuleTokens + attachmentTokens;
}

// ─── System Identity ──────────────────────────────────────

const SYSTEM_IDENTITY = `You are the AI brand strategist assistant for Brandclaw.

Your role:
- Answer questions about the user's brand, strategy, personas, products, and campaigns
- Suggest improvements to brand assets, personas, and content
- Modify data when the user asks (via tools — always confirm before writing)
- Provide strategic advice grounded in the brand's actual data
- Be concise, actionable, and specific to THIS brand — never generic

Rules:
- Always use the provided brand context to ground your answers
- When suggesting changes, reference the specific field and current value
- Use tools to read data you need — don't guess or make up brand information
- For write actions: always explain what you want to change and why before calling the tool
- Respond in the same language the user writes in
- Be direct and professional — no unnecessary filler

Content review contract (review_content tool):
- Use \`review_content\` ONLY when ALL of these are true:
  (1) the user explicitly asks to review, check, score, or evaluate copy
      (e.g. "is this on-brand?", "review this", "check deze tekst", "F-VAL",
      "scoor dit"),
  (2) the paste-content (≥50 chars) OR a public URL is included in the SAME
      turn as the request. If the user announces a review-intent without
      content yet ("kun je mijn nieuwe blog reviewen?"), DO NOT call the
      tool — first ask them to paste the text or share the URL.
- DO NOT auto-trigger review_content on every assistant output you generate
  yourself, on quick clarification questions, or on user-edits to wizard fields.
  The tool consumes AI budget per run; sparing use is required.
- The tool returns composite score, threshold-status and the top-3 findings.
  After it runs, comment briefly on the most surprising finding in your own
  voice — don't repeat the card content verbatim. The user already sees the
  card. Suggest opening Brand Alignment → Content Review for the full set
  if findingsCount > 3.
- Never review competitor or third-party content the user hasn't pasted
  themselves. Only operate on user-supplied text or user-supplied URLs.

Content creation contract (CRITICAL):
- For ANY request to create or generate content (LinkedIn post, blog post, email,
  video script, ad copy, social caption, landing page, etc.) you MUST call the
  \`create_deliverable\` tool. NEVER write the content body, headline, hook, CTA,
  or any draft text in chat — even partially, even as a "preview".
- The Content Canvas is the place where copy gets generated, edited, and
  approved — it has the full brand voice, medium config, persona context,
  and variant grid. Your job in chat is to (1) figure out which content type
  they want, (2) which campaign it belongs to, and (3) call
  \`create_deliverable\` with a tight briefing in the \`brief\` field.
- Campaign selection is a hard prerequisite for \`create_deliverable\`. ALWAYS
  call \`list_campaigns\` first when no campaign is implied by context, and
  present the existing options to the user before doing anything else. Only
  call \`create_campaign\` after the user has explicitly seen the existing
  list and confirmed they want a fresh campaign — never auto-create one
  silently as a shortcut.
- After the user confirms the create_deliverable proposal, the app
  automatically navigates them to the Canvas. Don't try to do the
  generation yourself in chat — trust the tool + the Canvas.
- If the user explicitly insists "just write it here, don't open canvas",
  briefly explain that the Canvas is where generation happens and offer
  to open it via \`create_deliverable\`. Do not write the body in chat.
- AFTER landing in the Canvas the user can ask you in chat to refine,
  rewrite, or shorten — at that point use the relevant update tools or
  give targeted advice. The chat is a sidekick to the Canvas, not a
  replacement for it.`;

// ─── Module Context Fetchers ──────────────────────────────

async function fetchModuleContext(
  workspaceId: string,
  module: ContextModule,
  entityIds?: string[]
): Promise<string | null> {
  switch (module) {
    case 'brand_assets':
      // Already included via getBrandContext — skip detailed fetch unless specific IDs
      if (!entityIds?.length) return null;
      return fetchBrandAssetDetails(workspaceId, entityIds);

    case 'brandstyle':
      // Already included via getBrandContext
      return null;

    case 'personas':
      return fetchPersonaContext(workspaceId, entityIds);

    case 'products':
      return fetchProductContext(workspaceId, entityIds);

    case 'competitors':
      return fetchCompetitorContext(workspaceId, entityIds);

    case 'trends':
      return fetchTrendContext(workspaceId);

    case 'strategies':
      return fetchStrategyContext(workspaceId, entityIds);

    case 'campaigns':
      return fetchCampaignContext(workspaceId, entityIds);

    case 'alignment':
      return fetchAlignmentContext(workspaceId);

    case 'knowledge':
      return fetchKnowledgeContext(workspaceId);

    case 'dashboard':
      return fetchDashboardContext(workspaceId);

    default:
      return null;
  }
}

async function fetchBrandAssetDetails(workspaceId: string, ids: string[]): Promise<string | null> {
  const assets = await prisma.brandAsset.findMany({
    where: { workspaceId, id: { in: ids } },
    select: { name: true, content: true, frameworkType: true, frameworkData: true },
  });
  if (!assets.length) return null;

  const lines = ['## Selected Brand Assets (Detail)'];
  for (const a of assets) {
    lines.push(`### ${a.name} (${a.frameworkType})`);
    if (a.content) lines.push(truncate(String(a.content), 500));
    if (a.frameworkData) lines.push('Framework: ' + truncate(JSON.stringify(a.frameworkData), 1000));
  }
  return lines.join('\n');
}

async function fetchPersonaContext(workspaceId: string, ids?: string[]): Promise<string | null> {
  const personas = await prisma.persona.findMany({
    where: { workspaceId, ...(ids?.length ? { id: { in: ids } } : {}) },
    select: {
      id: true, name: true, age: true, location: true, occupation: true,
      goals: true, frustrations: true, motivations: true, quote: true,
      personalityType: true, interests: true,
      preferredChannels: true, buyingTriggers: true,
    },
    take: 10,
  });
  if (!personas.length) return null;

  const lines = ['## Personas'];
  for (const p of personas) {
    lines.push(`### ${p.name} (${p.age ?? '?'}, ${p.occupation ?? 'Unknown'})`);
    if (p.location) lines.push(`Location: ${p.location}`);
    if (p.quote) lines.push(`Quote: "${p.quote}"`);
    if (p.goals) lines.push(`Goals: ${formatArray(p.goals as string[])}`);
    if (p.frustrations) lines.push(`Frustrations: ${formatArray(p.frustrations as string[])}`);
    if (p.motivations) lines.push(`Motivations: ${formatArray(p.motivations as string[])}`);
    if (p.personalityType) lines.push(`Personality: ${p.personalityType}`);
    if (p.preferredChannels) lines.push(`Channels: ${formatArray(p.preferredChannels as string[])}`);
    if (p.buyingTriggers) lines.push(`Buying Triggers: ${formatArray(p.buyingTriggers as string[])}`);
  }
  return lines.join('\n');
}

async function fetchProductContext(workspaceId: string, ids?: string[]): Promise<string | null> {
  const products = await prisma.product.findMany({
    where: { workspaceId, ...(ids?.length ? { id: { in: ids } } : {}) },
    select: {
      name: true, category: true, description: true, pricingDetails: true,
      features: true, benefits: true, useCases: true,
    },
    take: 10,
  });
  if (!products.length) return null;

  const lines = ['## Products & Services'];
  for (const p of products) {
    lines.push(`### ${p.name} (${p.category})`);
    if (p.description) lines.push(truncate(p.description, 300));
    if (p.pricingDetails) lines.push(`Pricing: ${String(p.pricingDetails)}`);
    if (p.features?.length) lines.push(`Features: ${(p.features as string[]).join(', ')}`);
    if (p.benefits?.length) lines.push(`Benefits: ${(p.benefits as string[]).join(', ')}`);
  }
  return lines.join('\n');
}

async function fetchCompetitorContext(workspaceId: string, ids?: string[]): Promise<string | null> {
  const competitors = await prisma.competitor.findMany({
    where: { workspaceId, ...(ids?.length ? { id: { in: ids } } : {}) },
    select: {
      name: true, tier: true, competitiveScore: true,
      valueProposition: true, differentiators: true,
      strengths: true, weaknesses: true,
    },
    take: 10,
  });
  if (!competitors.length) return null;

  const lines = ['## Competitors'];
  for (const c of competitors) {
    lines.push(`### ${c.name} (${c.tier}, score: ${c.competitiveScore ?? 'N/A'})`);
    if (c.valueProposition) lines.push(`Value prop: ${truncate(c.valueProposition, 200)}`);
    if (c.strengths?.length) lines.push(`Strengths: ${(c.strengths as string[]).join(', ')}`);
    if (c.weaknesses?.length) lines.push(`Weaknesses: ${(c.weaknesses as string[]).join(', ')}`);
  }
  return lines.join('\n');
}

async function fetchTrendContext(workspaceId: string): Promise<string | null> {
  const trends = await prisma.detectedTrend.findMany({
    where: { workspaceId, isDismissed: false },
    select: { title: true, description: true, category: true, impactLevel: true, relevanceScore: true, whyNow: true },
    orderBy: { relevanceScore: 'desc' },
    take: 10,
  });
  if (!trends.length) return null;

  const lines = ['## Active Trends'];
  for (const t of trends) {
    lines.push(`- **${t.title}** (${t.category}, ${t.impactLevel}, relevance: ${t.relevanceScore})`);
    if (t.description) lines.push(`  ${truncate(t.description, 150)}`);
  }
  return lines.join('\n');
}

async function fetchStrategyContext(workspaceId: string, ids?: string[]): Promise<string | null> {
  const strategies = await prisma.businessStrategy.findMany({
    where: { workspaceId, ...(ids?.length ? { id: { in: ids } } : {}) },
    select: {
      name: true, type: true, status: true, progressPercentage: true,
      vision: true, rationale: true,
      objectives: { select: { title: true, status: true }, take: 5 },
    },
    take: 5,
  });
  if (!strategies.length) return null;

  const lines = ['## Business Strategies'];
  for (const s of strategies) {
    lines.push(`### ${s.name} (${s.status}, ${s.progressPercentage}%)`);
    if (s.vision) lines.push(`Vision: ${truncate(s.vision, 200)}`);
    if (s.objectives.length) {
      lines.push('Objectives:');
      for (const o of s.objectives) lines.push(`  - ${o.title} (${o.status})`);
    }
  }
  return lines.join('\n');
}

async function fetchCampaignContext(workspaceId: string, ids?: string[]): Promise<string | null> {
  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId, type: { not: 'CONTENT' }, ...(ids?.length ? { id: { in: ids } } : {}) },
    select: {
      title: true, type: true, status: true, campaignGoalType: true,
      confidence: true,
      _count: { select: { deliverables: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });
  if (!campaigns.length) return null;

  const lines = ['## Campaigns'];
  for (const c of campaigns) {
    lines.push(`- **${c.title}** (${c.type}, ${c.status}, goal: ${c.campaignGoalType ?? 'N/A'}, confidence: ${c.confidence ?? 'N/A'}%, deliverables: ${c._count.deliverables})`);
  }
  return lines.join('\n');
}

async function fetchAlignmentContext(workspaceId: string): Promise<string | null> {
  const scan = await prisma.alignmentScan.findFirst({
    where: { workspaceId, status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
    select: { score: true },
  });
  const issueCount = await prisma.alignmentIssue.count({
    where: { scan: { workspaceId }, status: 'OPEN' },
  });

  if (!scan) return null;
  return `## Brand Alignment\nOverall score: ${scan.score}% | Open issues: ${issueCount}`;
}

async function fetchKnowledgeContext(workspaceId: string): Promise<string | null> {
  const count = await prisma.knowledgeResource.count({ where: { workspaceId, isArchived: false } });
  const featured = await prisma.knowledgeResource.findMany({
    where: { workspaceId, isFeatured: true },
    select: { title: true, type: true },
    take: 5,
  });

  const lines = [`## Knowledge Library (${count} resources)`];
  if (featured.length) {
    lines.push('Featured:');
    for (const r of featured) lines.push(`  - ${r.title} (${r.type})`);
  }
  return lines.join('\n');
}

async function fetchDashboardContext(workspaceId: string): Promise<string | null> {
  const [assets, personas, strategies, campaigns] = await Promise.all([
    prisma.brandAsset.count({ where: { workspaceId } }),
    prisma.persona.count({ where: { workspaceId } }),
    prisma.businessStrategy.count({ where: { workspaceId, status: 'ACTIVE' } }),
    prisma.campaign.count({ where: { workspaceId, status: 'ACTIVE', type: { not: 'CONTENT' } } }),
  ]);

  return `## Dashboard Stats\nBrand assets: ${assets} | Personas: ${personas} | Active strategies: ${strategies} | Active campaigns: ${campaigns}`;
}

// ─── Helpers ──────────────────────────────────────────────

function formatPageContext(ctx: ClawPageContext): string {
  const lines = ['## Current Page', `The user is currently viewing: \`${ctx.page}\`.`];

  if (ctx.entityType && ctx.entityId) {
    const typeLabel = ENTITY_TYPE_LABELS[ctx.entityType] ?? ctx.entityType;
    const nameLabel = ctx.entityName ? `"${ctx.entityName}"` : '(unnamed)';
    lines.push(`Active entity: ${typeLabel} ${nameLabel} (id: ${ctx.entityId}).`);

    // Deliverable context gets its own instruction block — the user is in
    // the Content Canvas, the campaign is already known, and "vul de velden"
    // means edit Step 1 of THIS deliverable, not start a new search.
    if (ctx.entityType === 'deliverable') {
      const campaignNote = ctx.campaignId
        ? ` It belongs to campaign \`${ctx.campaignId}\`.`
        : '';
      lines.push(
        `The user is INSIDE the Content Canvas for this deliverable.${campaignNote} ` +
        'When they say "vul de velden", "fill in the briefing", "rewrite this", ' +
        '"shorten it", "make it more formal", or anything else about THIS content, ' +
        'they mean this deliverable. Do NOT search for a new campaign or call ' +
        '`create_deliverable` — the deliverable already exists.'
      );
      lines.push(
        'To fill or edit Step 1 (Review Context) fields:'
      );
      lines.push(
        '  1. Call `inspect_current_entity` with entityType=deliverable + entityId above. It returns: (a) the four briefing fields (objective / keyMessage / toneDirection / callToAction); (b) the type-specific `contentTypeInputs` plus `availableContentTypeKeys` listing valid empty keys (SEO keyword, structure, etc. — varies per content type); (c) the `visualBrief` (source + styleDirection chip + free text) with `visualBriefValidStyles` and `visualBriefValidSources` arrays.'
      );
      lines.push(
        '  2. Three write-tools cover Step 1, one per section: (a) `update_deliverable_brief` for the four strategic textareas. (b) `update_deliverable_content_inputs` for type-specific keys — ONLY use keys returned by inspect_current_entity, never invent keys. (c) `update_deliverable_visual_brief` for the Visual Brief subsection. All three apply via a user confirmation card — propose values grounded in brand context + persona psychographics, never generic filler.'
      );
      lines.push(
        '  3. CRITICAL when the user asks broadly ("vul de velden", "fill in everything", "complete the brief", "stel de briefing in"): propose updates across ALL THREE sections in a single turn — call all three write-tools in parallel. Skip a tool only when its section is already complete OR when no relevant context exists. Never stop after only one section unless the user was explicit ("only the visual brief", "alleen de tone").'
      );
      lines.push(
        '  4. For content body / variant rewrites (after Step 2 has run), give targeted writing advice the user can apply via the inline edit on each preview section. The Canvas variant grid is not directly editable through tools.'
      );
    } else {
      lines.push(
        'When the user says "this asset", "deze persona", "dit product", or "this competitor", ' +
        'assume they mean this entity — use the ID above in tool calls without asking for clarification.'
      );
      lines.push(
        'When the user asks about which fields are empty, wants to fill in fields, or asks for ' +
        'a review of the current entity, call `inspect_current_entity` FIRST with the entityType ' +
        'and entityId above. That tool returns the current value of each field with an isEmpty ' +
        'marker and the overall completeness percentage.'
      );
    }

    lines.push(
      'When creating new entities from this page, default to this workspace without further confirmation.'
    );
  } else if (!ctx.wizardSnapshot) {
    lines.push(
      'No specific entity is active. If the user refers to "this" or "the current", ask which one they mean.'
    );
  }

  if (ctx.wizardSnapshot) {
    lines.push('');
    lines.push(formatWizardSnapshot(ctx.wizardSnapshot));
  }

  if (ctx.formFillFields && ctx.formFillFields.length > 0) {
    lines.push('');
    lines.push(formatFormFillFields(ctx.formFillFields));
  }

  return lines.join('\n');
}

function formatFormFillFields(
  fields: NonNullable<ClawPageContext['formFillFields']>,
): string {
  const lines: string[] = [];
  lines.push('## Editable form fields on this page');
  lines.push('');
  lines.push(
    'The page has registered the following editable fields. You can propose ' +
    'values for any of them via the `fill_form_fields` tool — pass an array ' +
    'of `{ key, value }` objects matching keys exactly. Bracket notation ' +
    'like `goals[0].title` is supported when the registered key uses it.'
  );
  lines.push('');
  for (const f of fields) {
    if (f.isEmpty) {
      lines.push(`- ${f.label} (\`${f.key}\`): _empty_`);
    } else {
      lines.push(`- ${f.label} (\`${f.key}\`): ${f.currentValue}`);
    }
  }
  lines.push('');
  lines.push(
    'Prefer dedicated tools (e.g. `update_persona`, `update_deliverable_brief`) ' +
    'when they exist for this entity type. Use `fill_form_fields` only when ' +
    'no dedicated tool covers the field. The user sees a confirmation card ' +
    'before anything is applied; the page applies values to its in-memory ' +
    'form-state, and the user saves manually via the page\'s Save button.'
  );
  return lines.join('\n');
}

function formatWizardSnapshot(snapshot: NonNullable<ClawPageContext['wizardSnapshot']>): string {
  const lines = [`## ${snapshot.name} (in progress)`];
  if (snapshot.currentStep) lines.push(`Step: ${snapshot.currentStep}`);
  if (snapshot.notes) lines.push(snapshot.notes);
  lines.push('');
  lines.push('Current field values (wizard state — no DB row exists yet, so inspect_current_entity cannot fetch this):');
  for (const f of snapshot.fields) {
    if (f.isEmpty) {
      lines.push(`- ${f.label} (\`${f.key}\`): _empty_`);
    } else {
      lines.push(`- ${f.label} (\`${f.key}\`): ${f.value}`);
    }
  }
  lines.push('');
  lines.push(
    'When the user asks "which fields are empty" or "help me fill in the wizard", answer directly ' +
    'from this snapshot — do not call inspect_current_entity.'
  );
  lines.push(
    'You CAN fill wizard fields for the user. The right tool depends on which wizard this is:'
  );
  lines.push('- Campaign Wizard / Content Wizard → `update_campaign_wizard` (updates object with the field keys above).');
  lines.push('- Interview Wizard → `update_interview` (pass the interviewId + assetId from the snapshot notes, plus an updates object).');
  lines.push(
    'In both cases the user sees a confirmation card before anything is applied. Ground proposed ' +
    'values in the brand context above — never invent generic filler. When the user says "fill in …", ' +
    '"vul … in", or accepts a suggestion you made, call the matching tool.'
  );
  return lines.join('\n');
}

const ENTITY_TYPE_LABELS: Record<NonNullable<ClawPageContext['entityType']>, string> = {
  brand_asset: 'Brand Asset',
  persona: 'Persona',
  product: 'Product',
  competitor: 'Competitor',
  deliverable: 'Content Deliverable',
  campaign: 'Campaign',
};

function formatAttachments(attachments: ClawAttachment[]): string {
  const lines = ['## User Attachments'];
  for (const att of attachments) {
    lines.push(`### ${att.label} (${att.type})`);
    lines.push(truncate(att.content, 2000));
  }
  return lines.join('\n');
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

function formatArray(arr: unknown): string {
  if (!Array.isArray(arr)) return String(arr ?? '');
  return arr.filter(Boolean).join(', ');
}
