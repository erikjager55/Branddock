// =============================================================
// Refresh write helper — herbruikbare dual-write logica.
//
// Bevat de transactie-body die het refresh-endpoint én de smoke-test
// delen. Door deze code op één plek te houden is een regression in
// route-gedrag automatisch een regression in de smoke-test, en kunnen
// toekomstige callers (cron-monitoring in Fase 4, manual-refresh API)
// dezelfde correctheid hergebruiken.
//
// Gedrag:
// - Computeert diff (content + workflow) tegen vorige snapshot
// - Hash-match check via findUnique op (competitorId, contentHash);
//   bij match → no-op, geen snapshot-write
// - Schrijft Snapshot alleen bij hash-mismatch
// - Schrijft Activities altijd als er events zijn (workflow-events
//   kunnen los van een snapshot voorkomen, snapshotId is nullable)
// - Update Competitor pointer + metadata + counters in één call
//
// Concurrent-refresh tradeoff: bij echte concurrentie kan een race
// tussen findUnique en create een P2002 unique-violation triggeren.
// We catchen die NIET (Prisma `$transaction(fn)` wrapt geen
// savepoints, dus na caught P2002 zou PG in 25P02 aborted state
// raken). Caller krijgt 500; user kan retry'en. Productie-grade
// race-protection (`INSERT ... ON CONFLICT DO NOTHING` via raw SQL)
// is out-of-scope voor MVP Fase 1.
// =============================================================
import type { Prisma } from '@prisma/client';

import { computeDiff } from './diff-engine';
import type {
  CanonicalExtracted,
  ManualEventContext,
} from './types';

// Het project gebruikt een geëxtende PrismaClient via
// `withTokenEncryption` (zie src/lib/prisma.ts). Het callback-type
// van `$transaction` is daardoor structureel anders dan
// `Prisma.TransactionClient`, maar de DB-shape van de modellen die
// deze helper raakt is identiek. Caller cast bij aanroep met
// `as unknown as Prisma.TransactionClient` zodat het tx-shape-mismatch
// op één plek geïsoleerd blijft (zie route.ts en smoke-tests).
type PrismaTxClient = Prisma.TransactionClient;

export interface DualWriteParams {
  competitorId: string;
  workspaceId: string;

  // Workflow context — bron van waarheid is de live competitor row
  // vóór de update; dit zorgt dat een DRAFT→ANALYZED transitie ook
  // op een eerste-snapshot OF hash-match path zichtbaar wordt.
  workflowBefore: { status: string; tier: string };
  workflowAfter: { status: string; tier: string };

  // Canonical state
  prevCanonical: CanonicalExtracted | null;
  nextCanonical: CanonicalExtracted;
  newContentHash: string;
  newScrapeHash: string | null;

  // Refresh-only metadata die NIET in de hash zit maar wél vers wordt
  // overgeschreven (naam, hq, founding-year, score, raw analysisData).
  metadataUpdate: Prisma.CompetitorUpdateInput;

  // Snapshot herkomst
  triggerSource: 'MANUAL' | 'CRON_LIGHT' | 'CRON_DEEP' | 'API';
  signalSource:
    | 'MANUAL'
    | 'WEBSCRAPE'
    | 'EXA'
    | 'RSS'
    | 'WAYBACK'
    | 'REVIEWS'
    | 'GOOGLE_ALERT';
  triggeredById: string | null;
  scrapedJsonInfo: Prisma.InputJsonValue | undefined;
}

export interface DualWriteOutcome {
  outcome: 'snapshot-written' | 'no-op-hash-match';
  activitiesCreated: number;
  /** Geüpdate competitor-row na de transactie. Caller hoeft geen
   *  aparte findUnique meer te doen voor de response payload. */
  competitor: Awaited<ReturnType<PrismaTxClient['competitor']['update']>>;
}

/**
 * Voer de dual-write uit binnen een al lopende Prisma-transactie.
 *
 * Caller is verantwoordelijk voor het openen van `$transaction` —
 * deze functie schrijft puur binnen `tx`. Bij hash-collision (een
 * snapshot met dezelfde contentHash bestaat al voor deze competitor):
 * skip de snapshot-create en gebruik de bestaande snapshotId voor
 * activity-attribution.
 *
 * **Race-window**: tussen `findUnique` en `create` kan een concurrent
 * refresh een snapshot met dezelfde hash schrijven, wat een P2002
 * uniqueness-violation triggert. We vangen DAT NIET met try/catch —
 * Prisma's `$transaction(fn)` wrapt geen savepoints, dus na een
 * caught P2002 is de PG-transactie in `25P02 aborted` state en zouden
 * volgende statements alsnog falen. Bij die race krijgt de caller een
 * 500; user kan opnieuw refreshen (idempotent op de canonical state
 * via de findUnique-check). Voor productie-grade race-protection:
 * vervang door `INSERT ... ON CONFLICT DO NOTHING` via raw SQL of
 * splits in twee transacties — out-of-scope voor MVP Fase 1.
 *
 * Side-effects op de Competitor-pointer (volledige update inclusief
 * counters) gebeuren altijd, ook bij no-op — `lastScrapedAt` moet ook
 * bij hash-match worden bijgewerkt.
 */
export async function applyCompetitorRefreshDualWrite(
  tx: PrismaTxClient,
  params: DualWriteParams,
): Promise<DualWriteOutcome> {
  const {
    competitorId,
    workspaceId,
    workflowBefore,
    workflowAfter,
    prevCanonical,
    nextCanonical,
    newContentHash,
    newScrapeHash,
    metadataUpdate,
    triggerSource,
    signalSource,
    triggeredById,
    scrapedJsonInfo,
  } = params;

  const workflowCtx: ManualEventContext = { workflowBefore, workflowAfter };
  const detected = computeDiff(prevCanonical, nextCanonical, workflowCtx);

  // Hash-match check — als er al een snapshot met deze contentHash
  // bestaat is dit een no-op (refresh op identieke content).
  //
  // snapshotId blijft null op no-op pad: workflow-events (STATUS_CHANGED,
  // TIER_CHANGED) horen semantisch bij DEZE refresh-call, niet bij een
  // eerdere snapshot waaraan de hash toevallig matcht. Activity is
  // chronologisch geattribueerd via detectedAt.
  const existingSnapshot = await tx.competitorSnapshot.findUnique({
    where: {
      competitorId_contentHash: { competitorId, contentHash: newContentHash },
    },
    select: { id: true },
  });

  let snapshotId: string | null = null;
  const outcome: DualWriteOutcome['outcome'] = existingSnapshot
    ? 'no-op-hash-match'
    : 'snapshot-written';

  if (!existingSnapshot) {
    const snap = await tx.competitorSnapshot.create({
      data: {
        competitorId,
        workspaceId,
        contentHash: newContentHash,
        scrapeHash: newScrapeHash,
        extractedJson: nextCanonical as unknown as Prisma.InputJsonValue,
        scrapedJson: scrapedJsonInfo,
        triggerSource,
        signalSource,
        triggeredById,
        notes: null,
      },
      select: { id: true },
    });
    snapshotId = snap.id;
  }

  // Activities — workflow events kunnen ook bij no-op pad voorkomen
  // (DRAFT→ANALYZED transitie zonder content-wijziging). snapshotId is
  // dan null, wat schema toestaat.
  if (detected.length > 0) {
    await tx.competitorActivity.createMany({
      data: detected.map((a) => ({
        type: a.type,
        severity: a.severity,
        diffPayload: a.diffPayload as unknown as Prisma.InputJsonValue,
        summary: a.summary,
        detectionMethod: a.detectionMethod,
        confidence: a.confidence,
        snapshotId,
        competitorId,
        workspaceId,
      })),
    });
  }

  // Pointer update: metadata altijd vers; canonical pointers alleen
  // bij snapshot-written (anders blijft de "current" extractedJson
  // identiek aan de nieuwe canonical = zelfde state). Counters
  // ook conditioneel.
  const pointerCanonical: Prisma.CompetitorUpdateInput =
    outcome === 'snapshot-written'
      ? {
          tagline: nextCanonical.tagline,
          valueProposition: nextCanonical.valueProposition,
          targetAudience: nextCanonical.targetAudience,
          differentiators: nextCanonical.differentiators,
          mainOfferings: nextCanonical.mainOfferings,
          pricingModel: nextCanonical.pricingModel,
          pricingDetails: nextCanonical.pricingDetails,
          toneOfVoice: nextCanonical.toneOfVoice,
          messagingThemes: nextCanonical.messagingThemes,
          visualStyleNotes: nextCanonical.visualStyleNotes,
          strengths: nextCanonical.strengths,
          weaknesses: nextCanonical.weaknesses,
          socialLinks: (nextCanonical.socialLinks ?? undefined) as
            | Prisma.InputJsonValue
            | undefined,
          hasBlog: nextCanonical.hasBlog,
          hasCareersPage: nextCanonical.hasCareersPage,
        }
      : {};

  const updatedCompetitor = await tx.competitor.update({
    where: { id: competitorId },
    data: {
      ...metadataUpdate,
      ...pointerCanonical,
      status: workflowAfter.status as Prisma.CompetitorUpdateInput['status'],
      lastScrapedAt: new Date(),
      ...(outcome === 'snapshot-written' ? { snapshotCount: { increment: 1 } } : {}),
      ...(detected.length > 0
        ? { unacknowledgedActivityCount: { increment: detected.length } }
        : {}),
    },
  });

  return {
    outcome,
    activitiesCreated: detected.length,
    competitor: updatedCompetitor,
  };
}

// ─── Shared helpers voor canonical-extraction ───────────

/**
 * Cast Prisma's `Json` socialLinks naar een veilige
 * `Record<string, string> | null`. Accepteert alleen object-met-
 * string-values; arrays, primitives en mixed-shape vallen terug naar
 * null. Gebruik op elke plek waar Competitor.socialLinks wordt gelezen
 * voor canonical-vorming.
 */
export function safeSocialLinks(
  value: unknown,
): Record<string, string> | null {
  if (
    value === null ||
    value === undefined ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null;
  }
  const out: Record<string, string> = {};
  let hasAny = false;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v !== 'string') continue;
    out[k] = v;
    hasAny = true;
  }
  return hasAny ? out : null;
}
