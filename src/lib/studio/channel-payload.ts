/**
 * Payload-extractie voor kanaal-publicatie (LinkedIn / e-mail / WordPress).
 *
 * Pure functie zodat de leeg-guard testbaar is: een App-Router-route mag geen extra
 * symbolen exporteren, en dit is een pad dat écht naar buiten publiceert — het verdient
 * een test die niet de halve stack nodig heeft.
 *
 * Leest BEIDE content-ketens (2026-08-16, content-chain-accessor fase 2). De
 * component-keten levert de gestructureerde velden (title/body/cta/hashtags); is die leeg
 * — wat structureel het geval is voor de 11 keten-B-types (landing-page/faq-page/
 * product-page/microsite + de 7 long-form GEO-types) — dan valt de body terug op
 * `resolveDeliverableContent()`, dat `settings.structuredVariant` en het legacy
 * `generatedText` afhandelt.
 *
 * `assertPublishable()` blijft ertussen staan en wordt daar NIET soepeler van: een
 * deliverable met gegenereerde varianten waaruit nog niets is gekozen
 * (`structured-unchosen`) levert bewust nog steeds een lege body op. Extern publiceren
 * mag nooit gokken wélke variant de gebruiker bedoelde — beter geblokkeerd dan de
 * verkeerde tekst op LinkedIn.
 */

import {
  resolveDeliverableContent,
  type DeliverableLike,
} from '@/lib/content/resolve-deliverable-content';

export interface ChannelPayloadComponent {
  variantGroup: string | null;
  generatedContent: string | null;
  imageUrl?: string | null;
  componentType?: string;
  groupType?: string | null;
  order?: number | null;
  isSelected?: boolean | null;
  variantIndex?: number | null;
}

/**
 * Het deliverable zelf, zodat de accessor ook keten B/C kan lezen. Optioneel, zodat
 * bestaande call-sites en de guard-smoke ongewijzigd blijven werken op alleen componenten.
 *
 * Bewust het hele object en geen uitgepakte velden: dan noemt deze module `generatedText`
 * en `structuredVariant` nergens bij naam, en blijft de keten-guard van kracht zonder
 * `eslint-disable`. Doorgeven is geen lezen.
 */
export type ChannelPayloadSource = DeliverableLike;

export interface ChannelPayload {
  title: string;
  bodyText: string;
  cta: string;
  hashtags: string;
  metaDescription: string;
  /** Body + hashtags — wat een sociale post als tekst verstuurt. */
  fullText: string;
  heroImageUrl: string | null;
}

export function buildChannelPayload(
  components: ChannelPayloadComponent[],
  fallbackTitle: string,
  source?: ChannelPayloadSource,
): ChannelPayload {
  const textComponents = components.filter(
    (c) => c.generatedContent && c.variantGroup !== 'hero-image',
  );
  const heroComponent = components.find((c) => c.variantGroup === 'hero-image' && c.imageUrl);

  const byGroup: Record<string, string> = {};
  for (const comp of textComponents) {
    if (comp.variantGroup && comp.generatedContent) byGroup[comp.variantGroup] = comp.generatedContent;
  }

  let bodyText =
    byGroup.body ?? byGroup.caption ?? byGroup['body-sections'] ?? byGroup.introduction ?? '';
  const hashtags = byGroup.hashtags ?? '';
  let title = byGroup.title ?? byGroup.headline ?? byGroup.subject ?? fallbackTitle;

  // Keten B/C — alleen aanspreken als de component-keten niets opleverde. Voor de 11
  // keten-B-types is die keten structureel leeg; zonder deze stap publiceert de route
  // een lege post naar LinkedIn/WordPress (of blokkeert de guard een pagina die wél vol staat).
  if (bodyText.trim().length === 0 && source) {
    const resolved = resolveDeliverableContent(source);
    // `structured-unchosen` en `empty` laten de body bewust leeg: de guard hoort dan te
    // blokkeren. Gokken welke variant de gebruiker bedoelde is erger dan niet publiceren.
    if (resolved.kind === 'structured' || resolved.kind === 'components') {
      bodyText = resolved.text;
      if (!byGroup.title && !byGroup.headline && !byGroup.subject) {
        title = deriveTitleFromText(resolved.text) ?? title;
      }
    }
  }

  return {
    title,
    bodyText,
    cta: byGroup.cta ?? byGroup['call-to-action'] ?? '',
    hashtags,
    metaDescription: byGroup['meta-description'] ?? '',
    fullText: [bodyText, hashtags].filter(Boolean).join('\n\n'),
    heroImageUrl: heroComponent?.imageUrl ?? null,
  };
}

/**
 * Eerste zinvolle regel als titel, wanneer de component-keten geen titel-groep had.
 * Structured varianten beginnen met de hero-headline, dus die eerste regel is precies
 * wat een mens als titel zou kiezen. Cap op 120 tekens — een titelveld is geen alinea.
 */
function deriveTitleFromText(text: string): string | null {
  const first = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!first) return null;
  return first.length > 120 ? `${first.slice(0, 117)}...` : first;
}

/**
 * De tekst die daadwerkelijk de deur uit gaat, per provider — 1-op-1 gespiegeld op de
 * provider-switch in de route: sociale posts versturen `fullText` (body + hashtags),
 * e-mail en WordPress uitsluitend `bodyText`.
 *
 * De provider-waarde is `'linkedin-direct'`, niet `'linkedin'` (die tweede bestaat
 * elders als OAuth-id). Prefix-match zodat een hashtags-only post niet onterecht als
 * "leeg" geldt en een toekomstige sociale variant meelift; onbekende providers vallen
 * op de strengere body-only-lezing terug.
 */
const SOCIAL_PROVIDER_PREFIX = 'linkedin';

export function outboundTextFor(payload: ChannelPayload, provider: string): string {
  return provider.startsWith(SOCIAL_PROVIDER_PREFIX) ? payload.fullText : payload.bodyText;
}

/**
 * Is er iets zinnigs te versturen? Valideert de PAYLOAD, niet een proxy ervoor.
 *
 * De bestaande QA-gate (`getContentReadiness`) kan dit niet vangen en is daar ook niet
 * voor bedoeld: die oordeelt op een F-VAL-score die van de structured-keten is afgeleid,
 * terwijl deze payload uit de component-keten komt — een groene gate is dus juist bewijs
 * dát er goede content is, waarna we niets versturen. Bovendien is 'ie bewust
 * failsafe-open (`no-version` → canPublish=true, letterlijk "never generated").
 *
 * Bewust géén beeld-uitzondering: bij een long-form-deliverable bestáát de hero-image
 * wél, dus "leeg mag als er een beeld is" zou de guard uitschakelen voor precies het
 * geval dat 'm motiveert. Beeld-only publiceren is hier geen ondersteunde flow; wordt
 * dat ooit een feature, dan is dat een expliciete keuze met een eigen pad.
 */
export function isPublishable(payload: ChannelPayload, provider: string): boolean {
  return outboundTextFor(payload, provider).trim().length > 0;
}
