// =============================================================
// Snapshot writer
//
// Aangeroepen vanuit analysis-engine.ts na Phase 5 (Semantic Role
// Resolver). Schrijft één BrandstyleSnapshot rij per analyzer-run met
// hash-based dedupe: als de canonical model exact gelijk is aan de
// vorige snapshot, slaan we het schrijven over en retourneren we de
// bestaande row — voorkomt spurious history-entries bij no-op re-scans.
//
// Adopteert het hyperbrowserai/competitor-tracker patroon: hashes als
// fingerprint, append-only storage. Cleanup gebeurt in een aparte
// cron-job (zie snapshot-cleanup.ts in S5).
// =============================================================

import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { buildDesignSystemModel } from '@/lib/export/design-system/resolver';
import type { SnapshotTriggerSource } from './types';

export interface CreateSnapshotInput {
  brandstyleId: string;
  workspaceId: string;
  triggerSource: SnapshotTriggerSource;
  triggeredById?: string | null;
  /** Optioneel — als de caller al een serialized canonical model heeft
   *  (bijv. uit een test) kan dit meegegeven worden om dubbele resolve
   *  te voorkomen. Anders wordt buildDesignSystemModel aangeroepen. */
  canonicalModelOverride?: unknown;
  /** Optionele extra payload — scraped data + semantic tokens snapshot.
   *  Komt rechtstreeks uit de analyzer-pipeline, niet uit de DB. */
  scrapedJson?: unknown;
  semanticTokens?: unknown;
  scrapeHash?: string | null;
  screenshotUrl?: string | null;
}

export interface CreateSnapshotResult {
  /** True als er een nieuwe row is geschreven; false als gededupliceerd. */
  created: boolean;
  snapshotId: string;
  tokensHash: string;
}

/**
 * Schrijf een snapshot voor de gegeven brandstyle. Idempotent op
 * tokensHash — als de meest recente snapshot exact dezelfde hash
 * heeft retourneren we die ID en doen we geen DB-write.
 */
export async function createBrandstyleSnapshot(
  input: CreateSnapshotInput,
): Promise<CreateSnapshotResult> {
  const canonicalModel = input.canonicalModelOverride
    ?? (await buildDesignSystemModel(input.workspaceId));

  // Hash uitsluitend op de inhoud die designers schelen — sluit
  // generatedAt / resolvedAt timestamps uit zodat een no-op re-analyze
  // dezelfde fingerprint produceert.
  const tokensHash = computeTokensHash(canonicalModel);

  const previous = await prisma.brandstyleSnapshot.findFirst({
    where: { brandstyleId: input.brandstyleId },
    orderBy: { capturedAt: 'desc' },
    select: { id: true, tokensHash: true },
  });

  if (previous && previous.tokensHash === tokensHash) {
    return { created: false, snapshotId: previous.id, tokensHash };
  }

  const snapshot = await prisma.brandstyleSnapshot.create({
    data: {
      brandstyleId: input.brandstyleId,
      workspaceId: input.workspaceId,
      tokensHash,
      scrapeHash: input.scrapeHash ?? null,
      tokensJson: JSON.parse(JSON.stringify(canonicalModel)),
      scrapedJson: input.scrapedJson
        ? (JSON.parse(JSON.stringify(input.scrapedJson)) as object)
        : undefined,
      semanticTokens: input.semanticTokens
        ? (JSON.parse(JSON.stringify(input.semanticTokens)) as object)
        : undefined,
      screenshotUrl: input.screenshotUrl ?? null,
      triggerSource: input.triggerSource,
      triggeredById: input.triggeredById ?? null,
    },
  });

  return { created: true, snapshotId: snapshot.id, tokensHash };
}

/**
 * Strip volatile velden uit de canonical model voordat we hashen,
 * zodat dezelfde brand-state telkens dezelfde hash krijgt — ook al
 * is de capture-timestamp anders.
 */
function computeTokensHash(canonicalModel: unknown): string {
  if (!canonicalModel || typeof canonicalModel !== 'object') {
    return createHash('sha256').update('null').digest('hex');
  }
  const stripped = stripVolatile(canonicalModel as Record<string, unknown>);
  const json = JSON.stringify(stripped);
  return createHash('sha256').update(json).digest('hex');
}

function stripVolatile(obj: Record<string, unknown>): Record<string, unknown> {
  const next = { ...obj };
  if (next.meta && typeof next.meta === 'object') {
    const meta = { ...(next.meta as Record<string, unknown>) };
    delete meta.generatedAt;
    delete meta.resolvedAt;
    next.meta = meta;
  }
  // Diagnostics in semanticTokens variant — snapshot bewaart deze WEL,
  // maar niet als hash-input (anders zou een nieuwe resolver-versie
  // elke run als "veranderd" markeren).
  return next;
}
