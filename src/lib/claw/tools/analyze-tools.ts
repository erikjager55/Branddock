import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { ClawToolDefinition } from '../claw.types';
import {
  ingestPaste,
  ingestUrl,
  IngestError,
} from '@/lib/alignment/external-content-ingest';
import { runFidelityForExternalContent } from '@/lib/brand-fidelity/external-content-runner';

// Severity-rank voor client-side ordering (Prisma's enum-sort is alfabetisch:
// HIGH < LOW < MEDIUM). Top-level const zodat hij niet per-call her-alloceert.
const REVIEW_SEVERITY_RANK: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const TOP_FINDINGS_LIMIT = 3;
// Hard-cap op description/suggestion text in tool-result. Findings worden
// gestringified in elke vervolg-Anthropic-call's message-history; zonder cap
// kan een verbose F-VAL run het token-budget mid-conversation opvreten.
// Volledige tekst blijft in DB beschikbaar via de Surface C GET endpoint.
const TOP_FINDINGS_TEXT_CAP = 280;

// Schema gedeeld tussen tool-advertise (Anthropic) en runtime-validate
// (defense-in-depth bij chat-route die block.input direct doorzet).
//
// NB: Anthropic vereist `type: 'object'` op de root van input_schema; een
// Zod discriminatedUnion compileert (via onze minimal zod→json-schema
// converter) niet naar dat shape. Daarom flat object + cross-field check
// in execute(). Tool-description verheldert de paste-vs-url combinatie
// voor het model.
const REVIEW_CONTENT_INPUT = z.object({
  sourceType: z.enum(['paste', 'url']),
  content: z
    .string()
    .min(50, 'content must be at least 50 characters')
    .max(50_000, 'content exceeds 50,000 character limit')
    .optional(),
  url: z.string().url('must be a valid http(s) URL').optional(),
});

function capText(text: string | null | undefined, cap: number): string | null {
  if (!text) return null;
  if (text.length <= cap) return text;
  return text.slice(0, cap - 1).trimEnd() + '…';
}

/**
 * ANALYZE tools — perform AI-powered analysis on workspace data.
 * No confirmation needed (read-only analysis).
 */
export const analyzeTools: ClawToolDefinition[] = [
  {
    name: 'analyze_brand_completeness',
    description:
      'Analyze which brand assets have empty or incomplete fields. Returns a list of assets with their completion status and missing fields.',
    inputSchema: z.object({}),
    requiresConfirmation: false,
    category: 'analyze',
    execute: async (_params, ctx) => {
      const assets = await prisma.brandAsset.findMany({
        where: { workspaceId: ctx.workspaceId },
        select: {
          id: true,
          name: true,
          frameworkType: true,
          content: true,
          frameworkData: true,
          status: true,
        },
      });

      const analysis = assets.map((a) => {
        const hasContent = a.content && String(a.content).trim().length > 10;
        const fw = a.frameworkData as Record<string, unknown> | null;
        const fwFieldCount = fw ? Object.keys(fw).length : 0;
        const fwFilledCount = fw
          ? Object.values(fw).filter((v) => v != null && v !== '' && v !== '[]').length
          : 0;

        return {
          name: a.name,
          frameworkType: a.frameworkType,
          status: a.status,
          hasContent,
          frameworkFields: fwFieldCount,
          frameworkFilled: fwFilledCount,
          completenessPercent: fwFieldCount > 0 ? Math.round((fwFilledCount / fwFieldCount) * 100) : 0,
        };
      });

      const sorted = analysis.sort((a, b) => a.completenessPercent - b.completenessPercent);
      return {
        assets: sorted,
        summary: {
          total: sorted.length,
          fullyComplete: sorted.filter((a) => a.completenessPercent >= 90).length,
          needsWork: sorted.filter((a) => a.completenessPercent < 50).length,
          avgCompleteness: Math.round(sorted.reduce((sum, a) => sum + a.completenessPercent, 0) / (sorted.length || 1)),
        },
      };
    },
  },

  {
    name: 'analyze_persona_gaps',
    description:
      'Analyze persona profiles for missing or weak fields. Identifies gaps in demographics, psychographics, goals, and behaviors.',
    inputSchema: z.object({
      personaId: z.string().optional().describe('Specific persona ID, or omit for all'),
    }),
    requiresConfirmation: false,
    category: 'analyze',
    execute: async (params, ctx) => {
      const p = params as { personaId?: string };
      const personas = await prisma.persona.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          ...(p.personaId ? { id: p.personaId } : {}),
        },
      });

      const EXPECTED_FIELDS = [
        'name', 'age', 'location', 'occupation', 'gender',
        'goals', 'frustrations', 'motivations', 'behaviors',
        'personalityType', 'interests', 'preferredChannels',
        'buyingTriggers', 'decisionCriteria', 'quote', 'bio',
      ];

      const results = personas.map((persona) => {
        const personaData = persona as unknown as Record<string, unknown>;
        const missing: string[] = [];
        const weak: string[] = [];

        for (const field of EXPECTED_FIELDS) {
          const value = personaData[field];
          if (value == null || value === '') {
            missing.push(field);
          } else if (Array.isArray(value) && value.length === 0) {
            missing.push(field);
          } else if (typeof value === 'string' && value.length < 10) {
            weak.push(field);
          }
        }

        return {
          name: persona.name,
          id: persona.id,
          missingFields: missing,
          weakFields: weak,
          completeness: Math.round(((EXPECTED_FIELDS.length - missing.length) / EXPECTED_FIELDS.length) * 100),
        };
      });

      return { personas: results };
    },
  },

  {
    name: 'analyze_competitive_position',
    description:
      'Compare the brand against its competitors. Returns strengths, weaknesses, and positioning gaps.',
    inputSchema: z.object({}),
    requiresConfirmation: false,
    category: 'analyze',
    execute: async (_params, ctx) => {
      const [competitors, brandAssets] = await Promise.all([
        prisma.competitor.findMany({
          where: { workspaceId: ctx.workspaceId },
          select: {
            name: true, tier: true, competitiveScore: true,
            valueProposition: true, differentiators: true,
            strengths: true, weaknesses: true,
          },
        }),
        prisma.brandAsset.findMany({
          where: { workspaceId: ctx.workspaceId, frameworkType: { in: ['BRAND_PROMISE', 'BRAND_ESSENCE'] } },
          select: { name: true, frameworkType: true, frameworkData: true },
        }),
      ]);

      return {
        competitorCount: competitors.length,
        competitors: competitors.map((c) => ({
          name: c.name,
          tier: c.tier,
          score: c.competitiveScore,
          valueProposition: c.valueProposition,
          strengths: c.strengths,
          weaknesses: c.weaknesses,
        })),
        brandPositioning: brandAssets.map((a) => ({
          asset: a.name,
          type: a.frameworkType,
          data: a.frameworkData,
        })),
      };
    },
  },

  // ─── Δ-1 Surface D — Brand Assistant `review_content` chat-tool ───
  {
    name: 'review_content',
    description:
      "Run F-VAL fidelity review on text the user has pasted, or on a public URL. " +
      "Set sourceType='paste' AND copy the USER'S PASTED TEXT VERBATIM and IN FULL into `content` " +
      "(≥50 chars) — do NOT summarize, paraphrase, or pass the user's request sentence ('kun je " +
      "dit reviewen?') as content. The actual content is the longer block of text the user wants " +
      "reviewed. " +
      "Set sourceType='url' AND provide `url` if the user shares a link instead. " +
      "Returns composite score, threshold-status and the top-3 most severe findings (with location, " +
      "category and suggestion). Use this ONLY when the user explicitly asks to review their copy, " +
      "posts content for an on-brand check, or wants F-VAL feedback on a piece of writing — and " +
      "only when the paste-content or URL is included in the same turn. Do NOT auto-run on every " +
      "assistant output — this tool consumes AI budget and is rate-limited.",
    inputSchema: REVIEW_CONTENT_INPUT,
    requiresConfirmation: false,
    category: 'analyze',
    execute: async (params, ctx) => {
      // Defense-in-depth: chat-route forwards Anthropic's tool-call payload as
      // raw `block.input` (no safeParse on its side). If the model emits a
      // malformed shape, an inline cast would let it slip through to
      // ingestPaste/Url. Re-validate here with the same schema we advertise
      // to Anthropic — a parse-failure returns the same render-friendly
      // error shape as ingest-failures so the FE handles it uniformly.
      const parsed = REVIEW_CONTENT_INPUT.safeParse(params);
      if (!parsed.success) {
        // Join all issue messages — strips the actionable feedback the LLM
        // needs for self-correction if we'd only surface issues[0].
        const messages = parsed.error.issues
          .map((i) => i.message)
          .filter(Boolean)
          .join('; ');
        return {
          error: messages || 'Invalid review_content input',
          code: 'INVALID_INPUT',
          clientAction: 'review_findings_card' as const,
          failureReason: 'invalid_input',
        };
      }
      const data = parsed.data;
      // Cross-field check: schema is flat (Anthropic vereist type=object op
      // root, dus geen discriminatedUnion). Check hier of het juiste veld
      // gevuld is voor de gekozen sourceType — geeft duidelijke feedback
      // aan zowel model als user.
      if (data.sourceType === 'paste' && !data.content) {
        return {
          error: 'content is required when sourceType is paste',
          code: 'MISSING_CONTENT',
          clientAction: 'review_findings_card' as const,
          failureReason: 'invalid_input',
        };
      }
      if (data.sourceType === 'url' && !data.url) {
        return {
          error: 'url is required when sourceType is url',
          code: 'MISSING_URL',
          clientAction: 'review_findings_card' as const,
          failureReason: 'invalid_input',
        };
      }
      const input =
        data.sourceType === 'paste'
          ? { sourceType: 'paste' as const, content: data.content as string }
          : { sourceType: 'url' as const, url: data.url as string };

      // ── Ingest ──
      let contentText: string;
      let sourceUrl: string | null = null;
      try {
        if (input.sourceType === 'paste') {
          contentText = ingestPaste(input.content).text;
        } else {
          const ingest = await ingestUrl(input.url);
          contentText = ingest.text;
          sourceUrl = input.url;
        }
      } catch (err) {
        if (err instanceof IngestError) {
          // Render-friendly error voor chat — geen stack-trace.
          return {
            error: err.message,
            code: err.code,
            clientAction: 'review_findings_card' as const,
            failureReason: 'ingest_failed',
          };
        }
        throw err;
      }

      // ── Run F-VAL ──
      const runResult = await runFidelityForExternalContent({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        contentText,
        sourceType: input.sourceType,
        sourceUrl: sourceUrl ?? undefined,
        runJudge: true,
      });

      // ── Top-N findings ──
      // Take=200 als runaway-guard. Prisma's enum-orderBy is alfabetisch
      // (HIGH < LOW < MEDIUM), dus we kunnen niet DB-side de top-3 trekken
      // zonder priority-CASE; in plaats daarvan halen we tot 200 en sorteren
      // client-side. In praktijk produceert F-VAL <100 findings per review;
      // 200 dekt edge-cases (50k-char paste, zeer fluff-rijk) zonder een
      // pathologisch payload-risico.
      const allFindings = await prisma.brandReviewFinding.findMany({
        where: {
          contentReviewLogId: runResult.reviewLogId,
          workspaceId: ctx.workspaceId,
        },
        select: {
          severity: true,
          category: true,
          location: true,
          description: true,
          suggestion: true,
        },
        take: 200,
      });
      const topFindings = [...allFindings]
        .sort(
          (a, b) =>
            (REVIEW_SEVERITY_RANK[a.severity] ?? 99) -
            (REVIEW_SEVERITY_RANK[b.severity] ?? 99),
        )
        .slice(0, TOP_FINDINGS_LIMIT)
        // Cap text-velden — deze blob round-tript via tool_result terug naar
        // Anthropic in elke vervolg-turn van het gesprek.
        .map((f) => ({
          severity: f.severity,
          category: f.category,
          location: f.location,
          description: capText(f.description, TOP_FINDINGS_TEXT_CAP) ?? '',
          suggestion: capText(f.suggestion, TOP_FINDINGS_TEXT_CAP),
        }));

      // ── Output: compact JSON met clientAction marker ──
      // Chat-FE rendert ReviewFindingsCard wanneer clientAction matcht;
      // assistent ziet de gestructureerde data en kan in eigen voice
      // commentariëren. Volledige findings blijven via GET endpoint
      // /api/alignment/review-external/[reviewLogId] op te vragen.
      return {
        reviewLogId: runResult.reviewLogId,
        compositeScore: runResult.result.compositeScore,
        thresholdMet: runResult.result.thresholdMet,
        findingsCount: runResult.findingsCount,
        topFindings,
        scorerVersion: runResult.result.scorerVersion ?? null,
        clientAction: 'review_findings_card' as const,
      };
    },
  },
];

/**
 * NAVIGATE tools — steer the UI from the chat.
 * No confirmation needed.
 */
export const navigateTools: ClawToolDefinition[] = [
  {
    name: 'navigate_to_page',
    description:
      'Navigate the user to a specific page in the app. Close the Claw overlay and show the requested page. Available sections: dashboard, brand, personas, products, competitors, active-campaigns, trends, knowledge, business-strategy, brand-alignment, settings-account, media-library, ai-trainer, ai-studio.',
    inputSchema: z.object({
      section: z.string().describe('The section ID to navigate to'),
      entityId: z.string().optional().describe('Optional entity ID for detail pages'),
    }),
    requiresConfirmation: false,
    category: 'navigate',
    execute: async (params) => {
      const p = params as { section: string; entityId?: string };
      // Navigation is handled client-side — we return the intent
      return {
        action: 'navigate',
        section: p.section,
        entityId: p.entityId,
        message: `Navigate to ${p.section}${p.entityId ? ` (${p.entityId})` : ''}`,
      };
    },
  },

  {
    name: 'open_ai_exploration',
    description:
      'Open the AI Exploration chat for a specific brand asset. This starts an interactive Q&A session to refine the asset.',
    inputSchema: z.object({
      assetId: z.string().describe('The brand asset ID'),
    }),
    requiresConfirmation: false,
    category: 'navigate',
    execute: async (params) => {
      const p = params as { assetId: string };
      return {
        action: 'navigate',
        section: 'brand-asset-ai-exploration',
        entityId: p.assetId,
        message: 'Opening AI Exploration for this asset',
      };
    },
  },
];
