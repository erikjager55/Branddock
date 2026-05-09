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
      'Run F-VAL fidelity review on paste-content or a public URL. Returns composite score, threshold-status and the top-3 most severe findings (with location, category and suggestion). Use this ONLY when the user explicitly asks to review their copy, posts content for an on-brand check, or wants F-VAL feedback on a piece of writing. Do NOT auto-run on every assistant output — this tool consumes AI budget and is rate-limited.',
    inputSchema: z.discriminatedUnion('sourceType', [
      z.object({
        sourceType: z.literal('paste'),
        content: z
          .string()
          .min(50, 'content must be at least 50 characters')
          .max(50_000, 'content exceeds 50,000 character limit'),
      }),
      z.object({
        sourceType: z.literal('url'),
        url: z.string().url('must be a valid http(s) URL'),
      }),
    ]),
    requiresConfirmation: false,
    category: 'analyze',
    execute: async (params, ctx) => {
      const input = params as
        | { sourceType: 'paste'; content: string }
        | { sourceType: 'url'; url: string };

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
      // Fetch een ruime set en sorteer client-side op SEVERITY_RANK; Prisma's
      // enum-orderBy is alfabetisch (HIGH < LOW < MEDIUM), niet priority-based.
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
        take: 50,
      });
      const topFindings = [...allFindings]
        .sort(
          (a, b) =>
            (REVIEW_SEVERITY_RANK[a.severity] ?? 99) -
            (REVIEW_SEVERITY_RANK[b.severity] ?? 99),
        )
        .slice(0, TOP_FINDINGS_LIMIT);

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
