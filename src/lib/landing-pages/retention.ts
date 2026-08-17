// =============================================================
// Landing-page data-retentie — database-laag (ADR 2026-08-17)
//
// Windows en selectie-logica staan in `./retention-policy` (Prisma-vrij, dus
// zonder database verifieerbaar). Dit bestand doet alleen het praten met de DB
// en her-exporteert het beleid zodat consumenten één import-site hebben.
// =============================================================

import { prisma } from '@/lib/prisma';
import {
  COMPILED_HTML_KEEP_VERSIONS,
  FORM_SUBMISSION_RETENTION_MONTHS,
  PAGE_EVENT_RETENTION_MONTHS,
  retentionCutoff,
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

/** Max delete-batches per run → plafond van 200.000 rijen per tabel per nacht.
 *  Bereikt de lus dit plafond, dan is `truncated: true` — anders is
 *  "cap geraakt" niet te onderscheiden van "klaar". */
const MAX_DELETE_BATCHES = 40;

/**
 * Uitkomst van een opruimstap.
 *
 * `truncated` betekent: de lus-cap is geraakt, er staat nog werk open. Zonder
 * dit signaal leest een afgekapte run identiek aan een voltooide, en een tabel
 * die sneller groeit dan de cap hem leegt zou stil achterlopen.
 */
export interface PruneResult {
  count: number;
  truncated: boolean;
}

/** Gedeelde batched-delete lus: id's ophalen, per batch wissen, tellen. */
async function deleteInBatches(
  findIds: (take: number) => Promise<{ id: string }[]>,
  deleteByIds: (ids: string[]) => Promise<{ count: number }>,
): Promise<PruneResult> {
  let deleted = 0;
  for (let batch = 0; batch < MAX_DELETE_BATCHES; batch++) {
    const rows = await findIds(DELETE_BATCH_SIZE);
    if (rows.length === 0) return { count: deleted, truncated: false };
    const result = await deleteByIds(rows.map((row) => row.id));
    deleted += result.count;
    if (rows.length < DELETE_BATCH_SIZE) return { count: deleted, truncated: false };
  }
  return { count: deleted, truncated: true };
}

/**
 * Verwijdert PageEvents ouder dan het retentie-window.
 *
 * Leunt op de `@@index([createdAt])` op `PageEvent` — zonder die index is dit
 * elke nacht een volledige tabelscan, óók als er niets te verwijderen valt.
 */
export async function prunePageEvents(now: Date = new Date()): Promise<PruneResult> {
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
 * Leunt op de `@@index([createdAt])` op `FormSubmission`.
 */
export async function pruneFormSubmissions(now: Date = new Date()): Promise<PruneResult> {
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

/** Rijen per `compiledHtml`-batch. Ruim, en dat is bewust: anders dan bij de
 *  deletes — waar een batch een index-geleide lookup begrenst — kost elke extra
 *  iteratie hier een volledige `row_number()`-pass over `PagePublish`. Klein
 *  batchen vermenigvuldigt het werk dus in plaats van het te beperken. De update
 *  draait volledig server-side; er komt geen HTML in het geheugen. */
const HTML_PRUNE_BATCH_SIZE = 20_000;

/** Max `compiledHtml`-batches per run → 800.000 artifacts per nacht. */
const MAX_HTML_PRUNE_BATCHES = 40;

/**
 * Leegt `compiledHtml` op publishes voorbij het bewaar-venster.
 *
 * `puckData` en de publish-metadata blijven staan, dus rollback naar zo'n
 * versie blijft werken — die rendert dan via het runtime-fallback-pad.
 *
 * **Waarom één SQL-statement en niet een Prisma-lus.** Twee eerdere varianten
 * liepen vast op hetzelfde: "pagina die kandidaat is" en "pagina die werk heeft"
 * zijn niet hetzelfde. Een pagina met 6 HTML-dragende publishes waarvan de
 * live-pointer de oudste is blijft eeuwig kandidaat (6 > 5) terwijl er niets te
 * prunen valt, en geen enkele `groupBy`+`having`-drempel kan dat onderscheiden —
 * of de pointer binnen of buiten het venster valt is geen kwestie van aantallen.
 * Zulke pagina's hopen vooraan de id-ordening op en verhongeren de rest.
 *
 * `row_number()` drukt de regel exact uit: rangschik per pagina op versie —
 * **alleen over rijen die nog HTML dragen** (`WHERE compiledHtml IS NOT NULL` in
 * de subquery) — neem wat voorbij het venster valt en sluit de live-pointer uit.
 * Dat "alleen HTML-dragende rijen" is wezenlijk: telde het venster publish-rijen,
 * dan verloor een pagina wier vijf nieuwste compiles zijn mislukt (fail-soft, dus
 * rij zonder HTML) élk artifact dat ze nog had. Kandidaten zijn dus precies de
 * prunebare rijen — ze verlaten de verzameling zodra ze geleegd zijn, dus elke
 * batch boekt vooruitgang en er bestaat geen vastgelopen pagina.
 *
 * De live-uitsluiting zit in hetzelfde statement als de update, wat het venster
 * voor een gelijktijdige rollback terugbrengt tot één statement. **Gesloten is
 * het niet**: onder READ COMMITTED leest de subquery het snapshot van
 * statement-start en er wordt geen lock op `LandingPage` genomen, dus een
 * pointer-swap die binnen dat venster commit kan de net-live geworden versie
 * alsnog haar artifact zien verliezen. Gevolg is degradatie (runtime-render),
 * geen stukke pagina.
 *
 * `compiledHtml` wordt nooit geselecteerd, alleen `IS NOT NULL` getoetst — de
 * HTML zelf komt het geheugen niet in.
 *
 * De selectie-regel staat óók als pure functie in `selectPrunableCompiledHtml`;
 * die is de leesbare specificatie en wordt in de smoke tegen dit SQL-pad
 * afgezet (fixture met 8 publishes en live op v2).
 */
export async function pruneCompiledHtml(options?: {
  /** Alleen voor tests: verkleint de batch zodat het lus-gedrag te zien is. */
  batchSize?: number;
}): Promise<PruneResult> {
  const batchSize = options?.batchSize ?? HTML_PRUNE_BATCH_SIZE;
  let cleared = 0;

  for (let batch = 0; batch < MAX_HTML_PRUNE_BATCHES; batch++) {
    const affected = await prisma.$executeRaw`
      UPDATE "PagePublish" SET "compiledHtml" = NULL
      WHERE id IN (
        SELECT ranked.id FROM (
          SELECT pp.id,
                 lp.id IS NOT NULL AS is_live,
                 row_number() OVER (
                   PARTITION BY pp."landingPageId" ORDER BY pp.version DESC
                 ) AS rn
          FROM "PagePublish" pp
          LEFT JOIN "LandingPage" lp ON lp."livePublishId" = pp.id
          WHERE pp."compiledHtml" IS NOT NULL
        ) ranked
        WHERE ranked.rn > ${COMPILED_HTML_KEEP_VERSIONS}
          AND NOT ranked.is_live
        LIMIT ${batchSize}
      )`;
    cleared += affected;
    if (affected < batchSize) return { count: cleared, truncated: false };
  }
  return { count: cleared, truncated: true };
}
