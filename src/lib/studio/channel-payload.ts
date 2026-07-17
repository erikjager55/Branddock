/**
 * Payload-extractie voor kanaal-publicatie (LinkedIn / e-mail / WordPress).
 *
 * Pure functie zodat de leeg-guard testbaar is: een App-Router-route mag geen extra
 * symbolen exporteren, en dit is een pad dat écht naar buiten publiceert — het verdient
 * een test die niet de halve stack nodig heeft.
 *
 * ⚠️ Deze extractie leest UITSLUITEND de component-keten. Dat is een bekend gat: de
 * structured/PUCK-types (landing-page/faq-page/product-page/microsite + de long-form
 * GEO-types) bewaren hun copy in `Deliverable.settings.structuredVariant` en hebben een
 * structureel lege component-keten. Voor die types levert dit dus een lege payload — en
 * dáárom staat `assertPublishable()` ertussen. De structurele fix (beide ketens lezen via
 * één accessor) volgt in een aparte task; deze module is bewust het chokepoint waar die
 * accessor straks inplugt, zodat er precies één plek is om te wijzigen.
 */

export interface ChannelPayloadComponent {
  variantGroup: string | null;
  generatedContent: string | null;
  imageUrl?: string | null;
}

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
): ChannelPayload {
  const textComponents = components.filter(
    (c) => c.generatedContent && c.variantGroup !== 'hero-image',
  );
  const heroComponent = components.find((c) => c.variantGroup === 'hero-image' && c.imageUrl);

  const byGroup: Record<string, string> = {};
  for (const comp of textComponents) {
    if (comp.variantGroup && comp.generatedContent) byGroup[comp.variantGroup] = comp.generatedContent;
  }

  const bodyText =
    byGroup.body ?? byGroup.caption ?? byGroup['body-sections'] ?? byGroup.introduction ?? '';
  const hashtags = byGroup.hashtags ?? '';

  return {
    title: byGroup.title ?? byGroup.headline ?? byGroup.subject ?? fallbackTitle,
    bodyText,
    cta: byGroup.cta ?? byGroup['call-to-action'] ?? '',
    hashtags,
    metaDescription: byGroup['meta-description'] ?? '',
    fullText: [bodyText, hashtags].filter(Boolean).join('\n\n'),
    heroImageUrl: heroComponent?.imageUrl ?? null,
  };
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
