// =============================================================
// Eén deur naar de inhoud van een deliverable.
//
// Branddock bewaart content op DRIE plekken:
//   keten A — `DeliverableComponent.generatedContent` (component-types)
//   keten B — `Deliverable.settings.structuredVariant` (11 types: 4 PUCK-webpage
//             + 7 long-form GEO). Voor deze types is keten A STRUCTUREEL leeg.
//   keten C — `Deliverable.generatedText` (legacy, vrijwel dood)
//
// Het type-systeem beveelt de verkeerde keten aan (240 getypeerde toegangen tot
// A, ~42 rauwe tot B), wat in acht weken vier keer dezelfde bug opleverde: een
// volle pagina die zich als leeg voordoet. Deze module is de leeslaag die dat
// verschil één keer afhandelt, met een discriminated union zodat de compiler
// exhaustiviteit afdwingt.
//
// Leeslaag only: hier wordt niets geschreven en niets gemigreerd.
// Zie ADR 2026-07-17-deliverable-content-accessor + tasks/content-chain-accessor.md.
// =============================================================

import { flattenPageVariantToText } from '@/lib/landing-pages/flatten-variant';
import type { PageVariantContent } from '@/lib/landing-pages/page-type-schemas';
import {
  countVariantOptions,
  readChosenVariant,
  readDeliverableSettings,
} from '@/lib/content/deliverable-settings';

/**
 * Het hero-beeld leeft als component in een eigen variantGroup (zie
 * `api/studio/[deliverableId]/hero-image/route.ts`). De constante staat daar en
 * in `lib/deliverable/patch-hero-visual.ts` los gedefinieerd; hier een derde
 * kopie i.p.v. een import, omdat een route-file in de App Router geen extra
 * symbolen mag exporteren. Opruimen hoort bij de schrijf-kant, buiten deze task.
 */
const HERO_VARIANT_GROUP = 'hero-image';

/**
 * Componenttypes die géén tekst dragen. Hun `generatedContent` bevat de gebruikte
 * PROMPT, niet de content — die meenemen in een tekstprojectie zou beeldprompts
 * als artikeltekst laten doorgaan (en bv. in F-VAL-scoring belanden).
 */
const NON_TEXT_COMPONENT_TYPES = new Set(['image', 'video']);

export interface DeliverableComponentLike {
  /** Optioneel: niet elke call-site heeft dit veld geselecteerd. Ontbreekt hij, dan
   *  telt de component als tekstdrager — dat is de veilige aanname, want alleen
   *  image/video worden uitgesloten. */
  componentType?: string | null;
  groupType?: string | null;
  generatedContent?: string | null;
  imageUrl?: string | null;
  variantGroup?: string | null;
  variantIndex?: number | null;
  isSelected?: boolean | null;
  order?: number | null;
}

export interface DeliverableLike {
  contentType?: string | null;
  /** Prisma `Json?` — kan letterlijk alles zijn; wordt defensief gelezen. */
  settings?: unknown;
  /** Keten C, legacy. */
  generatedText?: string | null;
  components?: DeliverableComponentLike[] | null;
}

export type ResolvedDeliverableContent =
  | {
      kind: 'components';
      text: string;
      byGroup: Record<string, string>;
      heroImageUrl: string | null;
      /** True wanneer de tekst uit keten C (`generatedText`) komt i.p.v. componenten. */
      legacy?: boolean;
    }
  | { kind: 'structured'; text: string; variant: PageVariantContent }
  | { kind: 'structured-unchosen'; optionCount: number }
  | { kind: 'empty' };

/**
 * Kiest per variantGroup welke componenten meetellen: de expliciet geselecteerde,
 * en anders variant 0. Zonder deze filter plakt een tekstprojectie varianten A/B/C
 * achter elkaar, wat als één artikel leest.
 */
function selectLiveComponents(components: DeliverableComponentLike[]): DeliverableComponentLike[] {
  const groupHasSelection = new Set<string>();
  for (const c of components) {
    if (c.isSelected && c.variantGroup) groupHasSelection.add(c.variantGroup);
  }
  return components.filter((c) => {
    if (!c.variantGroup) return true;
    if (groupHasSelection.has(c.variantGroup)) return c.isSelected === true;
    return (c.variantIndex ?? 0) === 0;
  });
}

function byOrder(a: DeliverableComponentLike, b: DeliverableComponentLike): number {
  return (a.order ?? 0) - (b.order ?? 0);
}

/**
 * De inhoud van een deliverable, ongeacht in welke keten die woont.
 *
 * **Precedentie** — een GEKOZEN structured variant wint van componenten:
 *
 *   structured variant → componenten → opties-zonder-keuze → generatedText → empty
 *
 * Dit wijkt bewust af van de volgorde in het task-file ("componenten-mét-inhoud →
 * gekozen variant"), omdat diezelfde task in de sectie *De flip* het tegendeel
 * eist en dáár de reden bij geeft: long-form defaultt op `['seo']` en gebruikt dan
 * keten A. Vinkt de gebruiker het GEO-doel aan, dan flipt het deliverable naar
 * keten B terwijl de oude `variantGroups` blijven staan. Zou keten A voorgaan, dan
 * geeft de accessor precies in dat geval de VEROUDERDE pre-flip-tekst terug — de
 * bug die deze task moet uitroeien. Wie een variant koos, koos die variant.
 */
export function resolveDeliverableContent(d: DeliverableLike): ResolvedDeliverableContent {
  const settings = readDeliverableSettings(d.settings);
  const chosen = readChosenVariant(settings);

  if (chosen) {
    // `flattenPageVariantToText` itereert rechtstreeks over `tldr`/`sections`/
    // `citeableStats`/`qa` en gaat uit van een schema-complete variant. Een
    // opgeslagen variant van vóór een schema-uitbreiding, of een partial uit een
    // afgebroken run, laat 'm gooien. Een leeslaag mag nooit de reden zijn dat een
    // consument 500't (gotcha 2026-03-24: een opgeslagen AI-payload is geen
    // garantie op zijn schema).
    try {
      const text = flattenPageVariantToText(chosen);
      if (text.trim().length > 0) return { kind: 'structured', text, variant: chosen };
    } catch (err) {
      console.warn('[deliverable-content] flatten van structuredVariant faalde', {
        contentType: d.contentType ?? null,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    // Bewust `empty` en géén terugval op componenten: dat zou opnieuw de
    // pre-flip-tekst opleveren. "Ik kan hier geen tekst van maken" is eerlijker
    // dan verouderde tekst die er juist genoeg uitziet.
    return { kind: 'empty' };
  }

  const components = selectLiveComponents(d.components ?? []);
  const textComponents = components
    .filter((c) => !NON_TEXT_COMPONENT_TYPES.has(c.componentType ?? ''))
    .filter((c) => (c.generatedContent ?? '').trim().length > 0)
    .sort(byOrder);

  if (textComponents.length > 0) {
    const byGroup: Record<string, string> = {};
    for (const c of textComponents) {
      const group = c.groupType ?? c.componentType ?? 'body';
      const body = (c.generatedContent ?? '').trim();
      byGroup[group] = byGroup[group] ? `${byGroup[group]}\n\n${body}` : body;
    }
    const heroImageUrl =
      components.find((c) => c.variantGroup === HERO_VARIANT_GROUP && c.imageUrl)?.imageUrl ??
      components.find((c) => c.imageUrl)?.imageUrl ??
      null;

    return {
      kind: 'components',
      text: textComponents.map((c) => (c.generatedContent ?? '').trim()).join('\n\n'),
      byGroup,
      heroImageUrl,
    };
  }

  const optionCount = countVariantOptions(settings);
  if (optionCount > 0) {
    // Content bestaat wél, maar de gebruiker koos nog geen variant. Niet gokken
    // welke hij bedoelde, en al helemaal niet stil "leeg" melden — de consument
    // moet dit onderscheid kunnen tonen. Dít is de kind die 21 call-sites dwingt
    // te beslissen wat ze laten zien.
    return { kind: 'structured-unchosen', optionCount };
  }

  const legacy = (d.generatedText ?? '').trim();
  if (legacy.length > 0) {
    // Keten C is vrijwel dood maar niet leeg. Hij komt terug als `components`
    // met een `legacy`-markering: een vijfde `kind` zou álle consumenten dwingen
    // een keten af te handelen die juist verdwijnt, terwijl de vraag die ze
    // stellen ("is er tekst, en welke?") identiek is.
    return { kind: 'components', text: legacy, byGroup: {}, heroImageUrl: null, legacy: true };
  }

  return { kind: 'empty' };
}

/**
 * Platte tekst of `null` — voor consumenten die alleen "is er iets te versturen?"
 * willen weten. Bewust géén placeholder-string: een lege payload moet als leeg
 * herkenbaar blijven voor de publish-guard (#412).
 */
export function getDeliverableText(d: DeliverableLike): string | null {
  const content = resolveDeliverableContent(d);
  switch (content.kind) {
    case 'components':
    case 'structured':
      return content.text.trim().length > 0 ? content.text : null;
    case 'structured-unchosen':
    case 'empty':
      return null;
  }
}

// ─── Lijst-signaal ────────────────────────────────────────────────────────────

/**
 * Wat een LIJST over een deliverable moet weten, zonder de tekst zelf.
 *
 * - `ready`          — er is tekst; publiceren/exporteren kan.
 * - `awaiting-choice`— content is gegenereerd, maar de gebruiker koos nog geen
 *                      variant. Wél voortgang, géén verzendbare payload.
 * - `empty`          — niets gegenereerd.
 */
export type DeliverableContentState = 'ready' | 'awaiting-choice' | 'empty';

export interface DeliverableContentSignal {
  state: DeliverableContentState;
  /** Aantal varianten waaruit nog gekozen moet worden; 0 buiten `awaiting-choice`. */
  optionCount: number;
  /**
   * Woordentelling wanneer die gratis is (keten B en C staan al op de rij zelf).
   * `null` voor keten A: die telling kost de body van élke component, en dat is
   * precies wat een lijst-endpoint niet mag ophalen.
   */
  wordCount: number | null;
}

/** Marker, nooit zichtbaar buiten deze functie — zie `resolveDeliverableContentSignal`. */
const COMPONENT_PROBE = ' component-probe';

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

/**
 * Het content-signaal voor endpoints die over véél deliverables tegelijk gaan.
 *
 * Waarom niet gewoon `resolveDeliverableContent()`? Die heeft de componenten
 * mét hun `generatedContent` nodig. Voor één deliverable is dat prima; voor een
 * bibliotheek-lijst betekent het de volledige tekst van elke component van elke
 * deliverable over de lijn trekken. De aanroeper levert daarom alleen een
 * goedkope **telling** (een `take: 1`-existentiecheck volstaat) en krijgt hier
 * hetzelfde oordeel terug.
 *
 * De precedentie wordt hier bewust NIET herhaald: de telling gaat als
 * marker-component de echte accessor in, zodat "gekozen variant wint van
 * componenten" op precies één plek geschreven staat. Uit elkaar lopen kan niet.
 */
export function resolveDeliverableContentSignal(
  d: Omit<DeliverableLike, 'components'> & {
    /** Aantal componenten mét tekst. Alleen `> 0` doet ertoe. */
    textComponentCount: number;
  },
): DeliverableContentSignal {
  const components: DeliverableComponentLike[] =
    d.textComponentCount > 0 ? [{ componentType: 'text', generatedContent: COMPONENT_PROBE }] : [];

  const content = resolveDeliverableContent({ ...d, components });

  switch (content.kind) {
    case 'structured':
      return { state: 'ready', optionCount: 0, wordCount: countWords(content.text) };
    case 'components':
      // `legacy` = keten C, en die tekst staat écht op de rij. Anders won de
      // marker, en dan is de echte telling hier per definitie onbekend.
      return {
        state: 'ready',
        optionCount: 0,
        wordCount: content.legacy ? countWords(content.text) : null,
      };
    case 'structured-unchosen':
      return { state: 'awaiting-choice', optionCount: content.optionCount, wordCount: null };
    case 'empty':
      return { state: 'empty', optionCount: 0, wordCount: null };
  }
}
