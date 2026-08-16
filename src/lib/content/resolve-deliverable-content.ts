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
  componentType: string;
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
    .filter((c) => !NON_TEXT_COMPONENT_TYPES.has(c.componentType))
    .filter((c) => (c.generatedContent ?? '').trim().length > 0)
    .sort(byOrder);

  if (textComponents.length > 0) {
    const byGroup: Record<string, string> = {};
    for (const c of textComponents) {
      const group = c.groupType ?? c.componentType;
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
