// =============================================================
// Eén deur naar het SCHRIJVEN van `Deliverable.settings`.
//
// Zeven codepaden schrijven deze JSON-blob, allemaal als read-modify-write:
// lees de hele `settings`, spreid er wat sleutels overheen, schrijf 'm terug.
// Landt er tussen de read en de write een andere schrijver, dan verdwijnt diens
// werk — de autosave van de Puck-editor is de frequentste tegenpartij. Bij
// `generate-structured-variant` is dat venster minutenlang (de hele
// SSE-generatie), bij de rest milliseconden.
//
// ── Waarom een rijlock en niet "gewoon een transactie" ──────────────────────
// De vorige poging (publish/route.ts, GEO-haak) zette read + write in één
// `prisma.$transaction` en noteerde dat de race daarmee "geëlimineerd" was. Dat
// klopt niet. Prisma draait op de Postgres-default READ COMMITTED, en een kale
// SELECT neemt daar géén lock: twee transacties lezen allebei de oude blob, de
// tweede UPDATE wacht keurig op de eerste — en overschrijft die dan alsnog met
// een payload die op de verouderde read is gebouwd. Een transactie zónder lock
// verplaatst het venster, hij sluit het niet.
//
// `SELECT … FOR UPDATE` sluit het wél: de tweede lezer blokkeert op de lock tot
// de eerste commit, en leest dan de nieuwe waarde. Gekozen boven `jsonb_set`
// (de call-sites mergen hele objecten, geen losse paden) en boven
// SERIALIZABLE + retry (dat vraagt een retry-lus per call-site).
//
// Zie `tasks/lp-review-followups.md` §Robuustheid en de BEKENDE BEPERKING in
// `src/lib/deliverable/patch-hero-visual.ts`, die deze laag al aanwees.
// =============================================================

import type { Deliverable, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readDeliverableSettings, type DeliverableSettings } from '@/lib/content/deliverable-settings';

/**
 * De transactie-client van déze app.
 *
 * `Prisma.TransactionClient` past niet: de client is uitgebreid met
 * `withTokenEncryption`, en een extended client is structureel niet toewijsbaar
 * aan het kale transactietype. Zelfde afleiding als `PrismaTx` in
 * `src/lib/billing/credits/ledger.ts` — bewust gedupliceerd i.p.v. de
 * billing-laag te importeren vanuit de content-laag.
 */
type PrismaTx = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Muteer `settings` van één deliverable zonder een gelijktijdige schrijver te
 * clobberen.
 *
 * `mutate` krijgt de VERSE settings (gelezen onder rijlock) en geeft de nieuwe
 * blob terug, of `null` om niets te schrijven. De callback draait ín de
 * transactie met de rij gelockt: houd 'm synchroon en doe er geen I/O — elke
 * await erin verlengt de lock voor iedereen die op dezelfde rij wacht.
 *
 * @param extraData Andere kolommen die in dezelfde update mee moeten. Handig
 *   voor schrijvers die naast `settings` ook eigen velden zetten.
 * @returns De bijgewerkte rij, of `null` wanneer `mutate` niets te schrijven had.
 * @throws Wanneer de deliverable niet (meer) bestaat.
 */
export async function updateDeliverableSettings(
  deliverableId: string,
  mutate: (current: DeliverableSettings) => Record<string, unknown> | null,
  extraData?: Prisma.DeliverableUpdateInput,
): Promise<Deliverable | null> {
  return prisma.$transaction(async (tx) => {
    const next = mutate(await lockDeliverableSettings(tx, deliverableId));
    if (next === null) return null;

    return tx.deliverable.update({
      where: { id: deliverableId },
      data: {
        ...extraData,
        // Prisma's InputJsonValue accepteert geen `undefined` in de boom; de
        // round-trip strijkt dat glad en is wat élke call-site hiervoor al deed.
        settings: JSON.parse(JSON.stringify(next)) as Prisma.InputJsonValue,
      },
    });
  });
}

/**
 * De rij locken en zijn settings lezen, ín een transactie die de aanroeper al
 * heeft. Voor schrijvers die naast `settings` nog ander werk in dezelfde
 * transactie doen en dus niet in `updateDeliverableSettings` passen — een
 * geneste interactieve transactie bestaat niet in Prisma.
 *
 * Vanaf deze call houdt de aanroeper de rijlock tot zijn transactie commit.
 *
 * @throws Wanneer de deliverable niet (meer) bestaat.
 */
export async function lockDeliverableSettings(
  tx: PrismaTx,
  deliverableId: string,
): Promise<DeliverableSettings> {
  // Geparametriseerd door de tagged template — geen injectie-oppervlak.
  const locked = await tx.$queryRaw<{ settings: unknown }[]>`
    SELECT "settings" FROM "Deliverable" WHERE "id" = ${deliverableId} FOR UPDATE
  `;
  if (locked.length === 0) {
    throw new Error(`[deliverable-settings] deliverable ${deliverableId} bestaat niet`);
  }
  return readDeliverableSettings(locked[0].settings);
}
