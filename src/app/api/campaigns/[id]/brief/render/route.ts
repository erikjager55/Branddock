import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { mapToBriefViewModel } from '@/lib/campaigns/brief-data-mapper';
import { renderBriefMarkdown } from '@/lib/campaigns/brief-renderer';
import { generateWeekThemes } from '@/lib/campaigns/brief-week-theme-prompt';
import { getBrandContext } from '@/lib/ai/brand-context';
import type { CampaignBlueprint } from '@/lib/campaigns/strategy-blueprint.types';

/**
 * GET /api/campaigns/[id]/brief/render
 *
 * Levert een gerenderde 10-secties campagne-brief in markdown-format,
 * inclusief on-render gegenereerde week-thema's voor sectie 5. Geen
 * persistentie. Workspace-isolatie via `resolveWorkspaceId()`.
 *
 * Response shape:
 *   { markdown, missing[], generatedAt, durationMs, weekThemeError? }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();

  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const blueprint = parseBlueprint(campaign.strategy);

    const personaIds = collectPersonaIds(blueprint);
    // orderBy zorgt voor deterministische primary/secondary-volgorde tussen
    // renders — anders varieert "primair segment" per render.
    const personas = personaIds.length > 0
      ? await prisma.persona.findMany({
          where: { id: { in: personaIds }, workspaceId },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        })
      : [];

    // Cap op 200 rijen — voldoende voor alle gangbare platform×format-combinaties
    // van een workspace + globale defaults; voorkomt onbegrensde memory-load
    // bij toekomstige workspaces met honderden enrichment-rijen.
    //
    // orderBy zorgt voor deterministisch subset wanneer de cap hit: workspace-
    // specifieke rijen (non-null workspaceId) eerst, globale defaults
    // (workspaceId=null) als laatste. Postgres-default voor `ORDER BY DESC`
    // is `NULLS FIRST` — daarom expliciet `nulls: 'last'`. Stabiele tie-break
    // via id ASC voorkomt willekeur binnen dezelfde workspaceId-groep.
    const enrichments = await prisma.mediumEnrichment.findMany({
      where: { OR: [{ workspaceId }, { workspaceId: null, isDefault: true }] },
      select: { platform: true, format: true, phaseGuidance: true },
      orderBy: [{ workspaceId: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
      take: 200,
    });

    const { viewModel, missing } = mapToBriefViewModel({
      campaign,
      blueprint,
      personas,
      enrichments,
    });

    const brandContextSummary = await fetchBrandContextSummary(workspaceId);

    const themeResult = await generateWeekThemes({ viewModel, brandContextSummary });

    const markdown = renderBriefMarkdown({
      viewModel,
      weekThemes: themeResult.weekThemes,
      weekThemeError: themeResult.error ?? null,
    });

    return NextResponse.json({
      markdown,
      missing,
      generatedAt: viewModel.meta.generatedAt,
      durationMs: Date.now() - start,
      weekThemeError: themeResult.error ?? null,
      weekThemeDurationMs: themeResult.durationMs,
    });
  } catch (error) {
    // Log full detail server-side for debugging; return generic message to
    // client to avoid leaking stack traces / internal paths.
    console.error('[brief/render] failed:', error instanceof Error ? error.stack ?? error.message : error);
    return NextResponse.json(
      { error: 'Failed to render brief' },
      { status: 500 },
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function parseBlueprint(raw: unknown): CampaignBlueprint | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  // Een echt CampaignBlueprint heeft minstens deze top-level keys, en de
  // arrays die de mapper itereert moeten daadwerkelijk arrays zijn.
  // Defensive shape-check voorkomt runtime-throws bij corrupte JSON.
  if (!obj.strategy || typeof obj.strategy !== 'object') return null;
  if (!obj.channelPlan || typeof obj.channelPlan !== 'object') return null;
  if (!obj.assetPlan || typeof obj.assetPlan !== 'object') return null;

  const channelPlan = obj.channelPlan as Record<string, unknown>;
  if (channelPlan.channels !== undefined && !Array.isArray(channelPlan.channels)) return null;
  if (channelPlan.phaseDurations !== undefined && !Array.isArray(channelPlan.phaseDurations)) return null;

  const assetPlan = obj.assetPlan as Record<string, unknown>;
  if (assetPlan.deliverables !== undefined && !Array.isArray(assetPlan.deliverables)) return null;
  if (assetPlan.prepDeliverables !== undefined && !Array.isArray(assetPlan.prepDeliverables)) return null;

  // architecture is required door het CampaignBlueprint type — anders zou
  // de cast naar `as CampaignBlueprint` een type-leugen zijn.
  if (!obj.architecture || typeof obj.architecture !== 'object') return null;
  const architecture = obj.architecture as Record<string, unknown>;
  if (architecture.journeyPhases !== undefined && !Array.isArray(architecture.journeyPhases)) return null;

  return raw as CampaignBlueprint;
}

function collectPersonaIds(blueprint: CampaignBlueprint | null): string[] {
  if (!blueprint) return [];
  const set = new Set<string>();

  // Primaire bron: deliverables[*].targetPersonas (asset-plan)
  for (const d of blueprint.assetPlan?.deliverables ?? []) {
    for (const id of d.targetPersonas ?? []) {
      if (typeof id === 'string' && id.trim().length > 0) set.add(id);
    }
  }

  // Secundaire bron: architecture.journeyPhases[*].personaPhaseData[*].personaId
  // — campagnes kunnen personas op journey-niveau hebben zonder dat ze in
  // elke deliverable staan. Anders raken we sectie 2 leeg ondanks gevulde data.
  for (const phase of blueprint.architecture?.journeyPhases ?? []) {
    for (const entry of phase.personaPhaseData ?? []) {
      if (typeof entry.personaId === 'string' && entry.personaId.trim().length > 0) {
        set.add(entry.personaId);
      }
    }
  }

  return Array.from(set);
}

/**
 * Compacte brand-context samenvatting voor de week-thema-prompt.
 * Alleen tone + audience-relevante velden — houdt token-budget binnen ~500.
 * Faalt safe: bij missing/error retourneert undefined zodat de prompt
 * zonder brand-context werkt.
 */
async function fetchBrandContextSummary(workspaceId: string): Promise<string | undefined> {
  try {
    const ctx = await getBrandContext(workspaceId);
    const parts: string[] = [];
    if (ctx.brandName) parts.push(`Brand: ${ctx.brandName}`);
    if (ctx.brandPersonality) parts.push(`Personality: ${ctx.brandPersonality}`);
    if (ctx.brandToneOfVoice) parts.push(`Tone of voice: ${ctx.brandToneOfVoice}`);
    if (ctx.targetAudience) parts.push(`Target audience: ${ctx.targetAudience}`);
    if (parts.length === 0) return undefined;
    return parts.join('\n');
  } catch (err) {
    console.warn('[brief/render] brand-context fetch failed:', err instanceof Error ? err.message : err);
    return undefined;
  }
}
