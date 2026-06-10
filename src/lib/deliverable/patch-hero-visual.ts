import { prisma } from '@/lib/prisma';

/**
 * Pure transform (geïsoleerd zodat 'm deterministisch getest kan worden zonder
 * DB): zet `heroUrl` op ELKE `BrandHero`-block in `puckData.content` en op
 * `structuredVariant.hero`. Muteert het meegegeven settings-object in place
 * (het is een verse JSON-kopie uit de DB) en retourneert of er iets gewijzigd is.
 *
 * `onlyIfEmpty`: schrijf alleen waar nog géén non-lege URL staat (fill-only).
 * Voor het self-heal-pad: de heal draait ~30s async — kiest de user intussen
 * handmatig een beeld via het Puck image-field, dan mag de heal-completion die
 * expliciete keuze niet overschrijven. Expliciete generate/compose/trained
 * flows blijven overwrite (default).
 */
export function applyHeroUrlToSettings(
  settings: Record<string, unknown>,
  heroUrl: string,
  opts?: { onlyIfEmpty?: boolean },
): { patched: boolean } {
  const onlyIfEmpty = opts?.onlyIfEmpty === true;
  const isFilled = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;
  const pd = settings.puckData as
    | { content?: Array<{ type?: string; props?: Record<string, unknown> }> }
    | undefined;
  let patched = false;
  if (Array.isArray(pd?.content)) {
    for (const c of pd!.content!) {
      if (c.type === 'BrandHero' && c.props) {
        if (onlyIfEmpty && isFilled(c.props.heroVisualUrl)) continue;
        c.props.heroVisualUrl = heroUrl;
        patched = true;
      }
    }
  }
  const sv = settings.structuredVariant as { hero?: Record<string, unknown> } | undefined;
  if (sv?.hero && !(onlyIfEmpty && isFilled(sv.hero.heroVisualUrl))) {
    sv.hero.heroVisualUrl = heroUrl;
    patched = true;
  }
  return { patched };
}

/**
 * Server-side hero-wiring (atomisch + idempotent + best-effort): bust een
 * geüploade image-URL in de landing-page-puckData (`BrandHero.heroVisualUrl`) +
 * `structuredVariant.hero.heroVisualUrl`. Herleest de settings vlak vóór de
 * write (klein race-window).
 *
 * De server is de enige autoriteit op de DB → dit landt gegarandeerd, i.t.t. de
 * eerdere client-side confirm-flow/self-heal die door een race + stale HMR de
 * header-image leeg liet (orphaned-hero audit 2026-06-08). Gedeeld door
 * generate-visual / generate-visual-compose / generate-visual-trained zodat alle
 * image-bronnen die als hero bedoeld zijn op één codepad wiren.
 *
 * Gooit NOOIT — orphaned-hero-preventie mag de variant-respons niet 500'en; bij
 * een gefaalde patch blijft het beeld als DeliverableComponent bestaan en kan een
 * latere (re)selectie de hero alsnog wiren.
 *
 * BEKENDE BEPERKING (pre-existing, gedeeld met de PATCH-route): dit is een
 * read-modify-write op de hele settings-blob zonder lock. Commit er een
 * gelijktijdige content-edit-PATCH in het smalle SELECT→UPDATE-venster, dan kan
 * die edit verloren gaan. Het venster is enkele ms (geen await tussen read en
 * write) en hero-generatie + content-edit overlappen zelden. Een sluitende fix
 * (atomische jsonb_set of serializable+retry) hoort de hele settings-write-laag
 * te dekken (generate-visual + PATCH-route) en valt buiten deze helper.
 */
export async function patchHeroVisualUrl(
  deliverableId: string,
  heroUrl: string,
  opts?: { onlyIfEmpty?: boolean },
): Promise<{ patched: boolean }> {
  try {
    const fresh = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      select: { settings: true },
    });
    const settings = (fresh?.settings ?? {}) as Record<string, unknown>;
    const { patched } = applyHeroUrlToSettings(settings, heroUrl, opts);
    if (patched) {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { settings: settings as never },
      });
    }
    return { patched };
  } catch (err) {
    console.error('[patchHeroVisualUrl] faalde:', err instanceof Error ? err.message : err);
    return { patched: false };
  }
}
