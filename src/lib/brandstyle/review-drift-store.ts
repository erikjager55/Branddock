// =============================================================
// Review-drift — de reset (DB-helft)
//
// Gescheiden van review-drift.ts zodat de mapping zonder database te testen
// blijft. Zie dat bestand voor de afwegingen.
// =============================================================

import { prisma } from "@/lib/prisma";
import { computeSnapshotDiff } from "./snapshots/snapshot-diff";
import {
  logoUrlsChanged,
  reviewSectionsFromDiff,
  type ReviewDrift,
} from "./review-drift";

export interface ReviewDriftResult {
  drift: ReviewDrift;
  /** Aantal reviews dat daadwerkelijk van APPROVED naar PENDING ging. */
  reset: number;
}

/**
 * Zet de goedkeuring van de geraakte secties terug op PENDING.
 *
 * Alleen `APPROVED` wordt geraakt: `NEEDS_WORK` is óók een besluit (en
 * blokkeert publish niet), en de feedback van de gebruiker mag niet
 * verdwijnen. `published` blijft bewust ongemoeid — anders zou één re-scrape
 * de merkcontext, de F-VAL-regels en het manifest van een klant stilleggen.
 * Dat is de asymmetrie met een handmatige "needs work", die wél depubliceert:
 * dat is een besluit, dit is een signaal.
 */
export async function applyReviewDrift(
  styleguideId: string,
  drift: ReviewDrift,
): Promise<ReviewDriftResult> {
  if (drift.sections.length === 0) return { drift, reset: 0 };

  const result = await prisma.styleguideReview.updateMany({
    where: {
      styleguideId,
      section: { in: drift.sections },
      status: "APPROVED",
    },
    data: { status: "PENDING", staleAt: new Date() },
  });

  return { drift, reset: result.count };
}

/**
 * Vergelijk de zojuist geschreven snapshot met de vorige en trek de
 * goedkeuring in van de secties die veranderden.
 *
 * Aan te roepen ná `createBrandstyleSnapshot`, en alleen wanneer die
 * `created: true` gaf — bij `false` is de hash identiek en is er per definitie
 * niets veranderd. Bestaat er geen vorige snapshot, dan is dit de eerste
 * analyse en valt er niets in te trekken.
 *
 * @param styleguideId - de styleguide
 * @param newSnapshotId - id van de snapshot die deze analyse schreef
 */
export async function resetReviewsAfterSnapshot(
  styleguideId: string,
  newSnapshotId: string,
): Promise<ReviewDriftResult> {
  const next = await prisma.brandstyleSnapshot.findUnique({
    where: { id: newSnapshotId },
    select: { capturedAt: true, tokensJson: true, scrapedJson: true },
  });
  if (!next) return { drift: { sections: [], reasons: {} }, reset: 0 };

  const previous = await prisma.brandstyleSnapshot.findFirst({
    where: { brandstyleId: styleguideId, capturedAt: { lt: next.capturedAt } },
    orderBy: { capturedAt: "desc" },
    select: { capturedAt: true, tokensJson: true, scrapedJson: true },
  });
  if (!previous) return { drift: { sections: [], reasons: {} }, reset: 0 };

  const diff = computeSnapshotDiff(
    { capturedAt: previous.capturedAt.toISOString(), tokensJson: previous.tokensJson },
    { capturedAt: next.capturedAt.toISOString(), tokensJson: next.tokensJson },
  );
  const drift = reviewSectionsFromDiff(diff, {
    logosChanged: logoUrlsChanged(previous.scrapedJson, next.scrapedJson),
  });

  return applyReviewDrift(styleguideId, drift);
}
