// =============================================================
// Wanneer mag een AFGEBROKEN variantgeneratie zijn deel-resultaat bewaren?
//
// Twee regels, allebei economisch. Ze staan hier los van de route omdat ze een
// productbeslissing coderen en niet een implementatiedetail — en omdat ze zo
// toetsbaar zijn zonder de route te booten.
// =============================================================

/**
 * Minimum aantal voltooide varianten om een afgebroken run te bewaren.
 *
 * Onder deze drempel is bewaren duurder dan weggooien: één variant biedt geen
 * vergelijking, dus de gebruiker regenereert toch — en betaalt dan de bewaarde
 * variant plus een volledige nieuwe set. Bij de standaard van 2 is 1-van-2
 * bewaren 1 + 2 = 3 calls, waar weggooien er 2 kost. Vanaf twee is er een
 * echte keuze en hoeft er niets teruggekocht te worden.
 *
 * Beslissing van 2026-08-18; herziet de keuze van 17-08 om nooit te bewaren.
 * Die keuze rustte op het toen nog open read-modify-write-venster, en dat is
 * gesloten met de rijlock in `updateDeliverableSettings`.
 */
export const MIN_PERSISTABLE_PARTIAL = 2;

/**
 * Zou het wegschrijven van `incomingCount` varianten een vollere set wissen?
 *
 * Het scenario: een eerdere run leverde vier varianten, de gebruiker start een
 * nieuwe run en loopt weg na twee. Zonder deze controle vervangt dat
 * deel-resultaat de vier die er al stonden — al betaald, en weg. De vergelijking
 * gebeurt op de VERSE settings (onder rijlock gelezen), niet op de snapshot van
 * vóór de generatie; anders bewijst hij niets.
 *
 * Alleen relevant voor afgebroken runs. Een voltooide run mág krimpen — dan
 * heeft de gebruiker bewust om minder varianten gevraagd.
 *
 * @param currentSettings de verse `Deliverable.settings`
 * @param incomingCount   aantal varianten dat deze afgebroken run wil bewaren
 */
export function partialWouldShrink(
  currentSettings: Record<string, unknown>,
  incomingCount: number,
): boolean {
  const existing = currentSettings.structuredVariantOptions;
  if (!Array.isArray(existing)) return false;
  return existing.length > incomingCount;
}
