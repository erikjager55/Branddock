/**
 * Bescherming van user-edits tijdens een re-analyse (verbeterplan W5).
 *
 * W5 maakte de analyze-*routes* niet-destructief, maar `writeResultToDb`
 * bleef de gerelateerde rijen wissen: kleuren, logo's en componenten gingen
 * bij élke re-scrape volledig op de schop. Alleen `StyleguideFont` deed het
 * goed — die filtert op `source: 'DETECTED'` en onderdrukt daarna de
 * inkomende namen die al als UPLOADED bestaan.
 *
 * Dit bestand generaliseert precies dat patroon. De volgorde is essentieel:
 *
 *   1. `deleteMany` mét een provenance-filter, zodat user-rijen blijven staan
 *   2. lees de overlevende user-rijen en bouw hun natural keys
 *   3. filter de inkomende analyzer-batch daartegen vóór de `createMany`
 *
 * Stap 3 is geen detail. Zonder suppressie verruil je dataverlies voor
 * duplicaten: de gebruiker houdt zijn eigen merkblauw én krijgt er elke run
 * een tweede, gescrapte rij met dezelfde hex naast.
 *
 * Alles hier is puur, zodat het zonder database te testen is.
 */

/** Eigenaarschap van een rij. Zelfde vocabulaire als `StyleguideRule.source`. */
export const ROW_SOURCE_SCRAPED = 'scraped';
export const ROW_SOURCE_USER = 'user';

/**
 * Normaliseert een hex naar een vergelijkbare sleutel: zonder `#`, lowercase.
 * `#FF0000`, `ff0000` en `#ff0000` zijn dezelfde kleur — een casing-verschil
 * mag geen duplicaat opleveren.
 */
export function colorKey(hex: string): string {
  return hex.trim().replace(/^#/, '').toLowerCase();
}

/**
 * Natural key voor een component: type + label. Het `id` is een cuid dat bij
 * elke re-analyse verandert, dus daar valt niet op te matchen; type+label is
 * wat de gebruiker in de UI als "hetzelfde component" herkent.
 */
export function componentKey(type: string, label: string): string {
  return `${type}::${label.trim().toLowerCase()}`;
}

/**
 * Filtert een inkomende analyzer-batch tegen de natural keys van rijen die de
 * gebruiker bezit. Behoudt de volgorde van de batch.
 *
 * @param incoming  De verse rijen uit de analyse.
 * @param keyOf     Hoe je de natural key uit zo'n rij haalt.
 * @param ownedKeys De natural keys van de overlevende user-rijen.
 */
export function suppressOwned<T>(
  incoming: readonly T[],
  keyOf: (row: T) => string,
  ownedKeys: ReadonlySet<string>,
): T[] {
  if (ownedKeys.size === 0) return [...incoming];
  return incoming.filter((row) => !ownedKeys.has(keyOf(row)));
}

/**
 * Varianten waarvan er maar één zinvol kan bestaan. PRIMARY is het merklogo —
 * twee daarvan betekent dat de renderer moet gokken. LOCKUP is expliciet
 * meervoudig (de scraper maakt er standaard meerdere), dus die mag je niet op
 * variant onderdrukken: één geüploade LOCKUP zou anders élke gedetecteerde
 * lockout permanent uit de bibliotheek houden.
 */
const EXCLUSIVE_LOGO_VARIANTS = new Set(['PRIMARY']);

/**
 * Logo's hebben geen `source`-kolom nodig: `uploadedById` wordt uitsluitend
 * door de upload-route gezet en door de analyzer nooit, dus dat veld ís al de
 * discriminator.
 *
 * Twee regels, want de varianten verschillen van aard:
 *   - een exclusieve variant (PRIMARY) die de gebruiker bezit, blokkeert de
 *     gescrapte tegenhanger volledig;
 *   - voor de rest telt alleen de URL — dezelfde asset niet twee keer.
 */
export function suppressOwnedLogoVariants<T extends { variant: string; fileUrl: string }>(
  incoming: readonly T[],
  owned: ReadonlyArray<{ variant: string; fileUrl: string }>,
): T[] {
  const ownedExclusive = new Set(
    owned.filter((l) => EXCLUSIVE_LOGO_VARIANTS.has(l.variant)).map((l) => l.variant),
  );
  const ownedUrls = new Set(owned.map((l) => l.fileUrl));
  return incoming
    .filter((row) => !ownedUrls.has(row.fileUrl))
    // Een gedetecteerd logo dat alleen tót PRIMARY was gepromoveerd omdat er
    // niets beters was, degradeert naar LOCKUP zodra de gebruiker een eigen
    // PRIMARY heeft. Weggooien zou de asset elke run uit de bibliotheek laten
    // verdwijnen terwijl er niets mis mee is.
    .map((row) =>
      ownedExclusive.has(row.variant) ? { ...row, variant: 'LOCKUP' } : row,
    );
}

/**
 * Deelt sorteerposities uit aan de verse batch die de bewaarde user-rijen niet
 * al bezetten.
 *
 * Sorteervolgorde is in deze module betekenisdragend, geen presentatie:
 * `pickBrand` in de LP-renderer neemt de eerste PRIMARY op `sortOrder` als
 * merkkleur, en de semantic-resolver kiest op dezelfde manier. Een bewaarde rij
 * mag haar plek dus niet verliezen (dan verandert het toggelen van één tag
 * stilletjes de merkkleur), en twee rijen op dezelfde positie maken de volgorde
 * willekeurig.
 */
export function allocateFreeSlots(count: number, taken: ReadonlySet<number>): number[] {
  const slots: number[] = [];
  for (let slot = 0; slots.length < count; slot++) {
    if (!taken.has(slot)) slots.push(slot);
  }
  return slots;
}

/**
 * Zoals `onlyProvided`, maar zónder de leeg-check: alleen een claim van de
 * gebruiker houdt het veld tegen. Voor afgeleide data die als blok hoort te
 * reizen — daar is een lege waarde een geldig resultaat ("deze site heeft maar
 * één font") en zou 'm overslaan juist een stale waarde conserveren.
 */
export function omitClaimed<T extends object>(
  candidate: T,
  userEditedFields: readonly string[] = [],
): Partial<T> {
  const owned = new Set(userEditedFields);
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(candidate) as Array<[keyof T, T[keyof T]]>) {
    if (owned.has(String(key))) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Bouwt een update-object dat alleen de velden bevat die de analyzer
 * daadwerkelijk gevuld heeft.
 *
 * Het bestaande `result.x || []`-patroon in `writeResultToDb` overschrijft een
 * gecureerde don'ts-lijst met een lege array zodra de AI niets teruggeeft —
 * en een AI die niets teruggeeft is geen zeldzaamheid. Dit is het patroon dat
 * de tone-of-voice-staart van diezelfde functie al hanteert: schrijf alleen
 * wat er is, laat de rest met rust.
 *
 * `null` en `undefined` gelden als "niets gevonden"; een lege array of lege
 * string ook. `false` en `0` zijn wél betekenisvolle waarden en worden dus
 * geschreven.
 */
export function onlyProvided<T extends object>(
  candidate: T,
  userEditedFields: readonly string[] = [],
): Partial<T> {
  const owned = new Set(userEditedFields);
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(candidate) as Array<[keyof T, T[keyof T]]>) {
    // Een veld dat de gebruiker zélf schreef is van hem, ook als de analyzer
    // deze run wél iets te melden heeft. Zonder deze check wint een geslaagde
    // AI-respons het altijd van een handmatig samengestelde don'ts-lijst.
    if (owned.has(String(key))) continue;
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    out[key] = value;
  }
  return out;
}

/**
 * De velden waarvoor `userEditedFields` eigenaarschap kan vastleggen: precies
 * de lijsten en typografievelden die `writeResultToDb` bij elke analyse
 * herschrijft. Velden met een eigen `*Override`-vlag staan hier bewust niet
 * tussen — die hebben hun eigen mechanisme.
 */
export const CLAIMABLE_STYLEGUIDE_FIELDS = [
  // Tekstlijsten
  'logoGuidelines',
  'logoDonts',
  'colorDonts',
  'photographyGuidelines',
  'illustrationGuidelines',
  'imageryDonts',
  'graphicElementsDonts',
  'iconographyDonts',
  // Typografieprofiel
  'primaryFontName',
  'primaryFontUrl',
  'additionalFonts',
  'typeScale',
  // De Json-helften van diezelfde secties. Ze zijn via exact dezelfde routes
  // bewerkbaar als hun `*Donts`-buren en werden door de analyzer even hard
  // overschreven — alleen de lijsten beschermen laat de halve sectie open.
  'photographyStyle',
  'graphicElements',
  'patternsTextures',
  'iconographyStyle',
  'gradientsEffects',
  'layoutPrinciples',
] as const;

export type ClaimableStyleguideField = (typeof CLAIMABLE_STYLEGUIDE_FIELDS)[number];

/**
 * Werkt de claim-lijst bij na een user-PATCH. Velden die de gebruiker schrijft
 * worden geclaimd; een veld dat hij expliciet op `null` of leeg zet geeft hij
 * juist terug aan de scraper.
 */
export function applyFieldClaims(
  current: readonly string[],
  patched: Record<string, unknown>,
): string[] {
  const claimed = new Set(current);
  for (const field of CLAIMABLE_STYLEGUIDE_FIELDS) {
    if (!(field in patched)) continue;
    const value = patched[field];
    const isEmpty =
      value === null ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'string' && value.trim() === '');
    if (isEmpty) claimed.delete(field);
    else claimed.add(field);
  }
  return [...claimed];
}
