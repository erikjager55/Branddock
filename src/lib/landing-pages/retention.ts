// =============================================================
// Landing-page data-retentie — database-laag (ADR 2026-08-17)
//
// Windows en selectie-logica staan in `./retention-policy` (Prisma-vrij, dus
// zonder database verifieerbaar). Dit bestand doet alleen het praten met de DB
// en her-exporteert het beleid zodat consumenten één import-site hebben.
// =============================================================

import { prisma } from '@/lib/prisma';
import {
  FORM_SUBMISSION_RETENTION_MONTHS,
  PAGE_EVENT_RETENTION_MONTHS,
  retentionCutoff,
  selectPrunableCompiledHtml,
} from './retention-policy';

export {
  COMPILED_HTML_KEEP_VERSIONS,
  FORM_SUBMISSION_RETENTION_MONTHS,
  PAGE_EVENT_RETENTION_MONTHS,
  retentionCutoff,
  selectPrunableCompiledHtml,
} from './retention-policy';
export type { PublishVersionRef } from './retention-policy';

/** Rijen per delete-batch. Eén `deleteMany` over een groeiende tabel is hoe
 *  je een serverless-timeout of een lange lock op Neon koopt. */
const DELETE_BATCH_SIZE = 5_000;

/** Harde lus-begrenzing per run — voorkomt dat een onverwacht grote tabel
 *  de cron-invocatie laat doorlopen tot de platform-timeout. */
const MAX_BATCHES_PER_RUN = 40;

/** Pagina's per iteratie bij het pruning-pad. */
const PAGE_SCAN_BATCH_SIZE = 100;

/** Gedeelde batched-delete lus: id's ophalen, per batch wissen, tellen. */
async function deleteInBatches(
  findIds: (take: number) => Promise<{ id: string }[]>,
  deleteByIds: (ids: string[]) => Promise<{ count: number }>,
): Promise<number> {
  let deleted = 0;
  for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch++) {
    const rows = await findIds(DELETE_BATCH_SIZE);
    if (rows.length === 0) break;
    const result = await deleteByIds(rows.map((row) => row.id));
    deleted += result.count;
    if (rows.length < DELETE_BATCH_SIZE) break;
  }
  return deleted;
}

/**
 * Verwijdert PageEvents ouder dan het retentie-window.
 *
 * @returns aantal verwijderde rijen
 */
export async function prunePageEvents(now: Date = new Date()): Promise<number> {
  const cutoff = retentionCutoff(PAGE_EVENT_RETENTION_MONTHS, now);
  return deleteInBatches(
    (take) =>
      prisma.pageEvent.findMany({
        where: { createdAt: { lt: cutoff } },
        select: { id: true },
        take,
      }),
    (ids) => prisma.pageEvent.deleteMany({ where: { id: { in: ids } } }),
  );
}

/**
 * Verwijdert FormSubmissions ouder dan het retentie-window (lead-PII).
 *
 * @returns aantal verwijderde rijen
 */
export async function pruneFormSubmissions(now: Date = new Date()): Promise<number> {
  const cutoff = retentionCutoff(FORM_SUBMISSION_RETENTION_MONTHS, now);
  return deleteInBatches(
    (take) =>
      prisma.formSubmission.findMany({
        where: { createdAt: { lt: cutoff } },
        select: { id: true },
        take,
      }),
    (ids) => prisma.formSubmission.deleteMany({ where: { id: { in: ids } } }),
  );
}

/**
 * Leegt `compiledHtml` op publishes voorbij het bewaar-venster.
 *
 * `puckData` en de publish-metadata blijven staan, dus rollback naar zo'n
 * versie blijft werken — die rendert dan via het runtime-fallback-pad.
 *
 * @returns aantal publishes waarvan de HTML is geleegd
 */
export async function pruneCompiledHtml(): Promise<number> {
  let cleared = 0;
  let cursor: string | undefined;
  for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch++) {
    const pages = await prisma.landingPage.findMany({
      take: PAGE_SCAN_BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        livePublishId: true,
        publishes: { select: { id: true, version: true } },
      },
    });
    if (pages.length === 0) break;
    cursor = pages[pages.length - 1].id;

    const prunableIds = pages.flatMap((page) =>
      selectPrunableCompiledHtml(page.publishes, page.livePublishId),
    );
    if (prunableIds.length > 0) {
      const result = await prisma.pagePublish.updateMany({
        where: { id: { in: prunableIds }, compiledHtml: { not: null } },
        data: { compiledHtml: null },
      });
      cleared += result.count;
    }
    if (pages.length < PAGE_SCAN_BATCH_SIZE) break;
  }
  return cleared;
}
