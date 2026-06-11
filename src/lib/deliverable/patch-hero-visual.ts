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
): { patched: boolean; puckPatched: boolean } {
  const onlyIfEmpty = opts?.onlyIfEmpty === true;
  const isFilled = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;
  const pd = settings.puckData as
    | { content?: Array<{ type?: string; props?: Record<string, unknown> }> }
    | undefined;
  let patched = false;
  // Apart gerapporteerd: alleen wanneer een BrandHero in puckData daadwerkelijk
  // deze URL kreeg, is dit de GERENDERDE hero. In fill-only-modus kan de
  // structuredVariant-fill slagen terwijl puckData een (handmatige) keuze
  // vasthoudt — afgeleiden zoals de hero-image-rij moeten dan NIET op deze
  // URL gezet worden, anders divergeren preview/checklist van de pagina.
  let puckPatched = false;
  if (Array.isArray(pd?.content)) {
    for (const c of pd!.content!) {
      if (c.type === 'BrandHero' && c.props) {
        if (onlyIfEmpty && isFilled(c.props.heroVisualUrl)) continue;
        c.props.heroVisualUrl = heroUrl;
        patched = true;
        puckPatched = true;
      }
    }
  }
  const sv = settings.structuredVariant as { hero?: Record<string, unknown> } | undefined;
  if (sv?.hero && !(onlyIfEmpty && isFilled(sv.hero.heroVisualUrl))) {
    sv.hero.heroVisualUrl = heroUrl;
    patched = true;
  }
  return { patched, puckPatched };
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
    const { patched, puckPatched } = applyHeroUrlToSettings(settings, heroUrl, opts);
    if (patched) {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { settings: settings as never },
      });
      // Rij alleen upserten wanneer de BrandHero in puckData daadwerkelijk
      // deze URL kreeg: de rij spiegelt de GERENDERDE hero. In fill-only-modus
      // (self-heal) kan `patched` true zijn via alleen de structuredVariant-
      // fill terwijl puckData een handmatige keuze vasthoudt — de rij van die
      // keuze dan overschrijven zou preview/checklist laten divergeren van de
      // gerenderde pagina (review-finding 2026-06-11). opts gaat mee: in
      // fill-only-modus is ook de rij-write strikt additief (nooit een
      // bestaande rij overschrijven) tegen het settings-TOCTOU-raam waarin
      // een net-gelande handmatige keuze hier nog niet zichtbaar was.
      if (puckPatched) {
        await upsertHeroImageComponent(deliverableId, heroUrl, opts);
      }
    }
    return { patched };
  } catch (err) {
    console.error('[patchHeroVisualUrl] faalde:', err instanceof Error ? err.message : err);
    return { patched: false };
  }
}

const HERO_VARIANT_GROUP = 'hero-image';

/**
 * Upsert van de `variantGroup='hero-image'`-rij — zelfde row-shape als
 * POST /api/studio/[deliverableId]/hero-image (het handmatige picker-pad).
 *
 * De canvas-store hydrateert `heroImage` uitsluitend uit deze rij en de
 * Planner-checklist (`has-image`) leest alleen die slice; zonder rij bleef
 * "Hero image added" false-negative voor AI-gegenereerde hero's (audit
 * 2026-06-10). Door de upsert hier — ná een geslaagde settings-patch — krijgen
 * alle drie de AI-routes (generate-visual / -compose / -trained) pariteit met
 * de handmatige picker. Alleen aanroepen wanneer `puckPatched` true is (de
 * BrandHero in puckData kreeg daadwerkelijk deze URL): de rij spiegelt de
 * gerenderde hero, en een handmatige keuze die in fill-only-modus puckData al
 * vasthield blijft zo ook hier intact.
 *
 * Best-effort: gooit nooit — de rij is een afgeleide van de settings-waarheid
 * en een gefaalde upsert mag de generate-respons niet 500'en.
 */
async function upsertHeroImageComponent(
  deliverableId: string,
  imageUrl: string,
  opts?: { onlyIfEmpty?: boolean },
): Promise<void> {
  try {
    const lastComponent = await prisma.deliverableComponent.findFirst({
      where: { deliverableId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const createData = {
      deliverableId,
      componentType: 'image',
      groupType: 'single',
      groupIndex: 0,
      order: (lastComponent?.order ?? -1) + 1,
      variantGroup: HERO_VARIANT_GROUP,
      variantIndex: 0,
      isSelected: true,
      imageUrl,
      imageSource: 'ai-generated',
      status: 'GENERATED' as const,
      generatedAt: new Date(),
    };

    if (opts?.onlyIfEmpty) {
      // Fill-only (self-heal): strikt additief — een bestaande rij is per
      // definitie een eerdere expliciete keuze (handmatig of een vorige
      // generate) en mag door een heal nooit overschreven worden, ook niet
      // in het TOCTOU-raam waarin de settings-read die keuze nog niet zag.
      // ON CONFLICT DO NOTHING via createMany + skipDuplicates.
      await prisma.deliverableComponent.createMany({
        data: [createData],
        skipDuplicates: true,
      });
      return;
    }

    // Atomisch op de compound-unique (deliverableId, variantGroup,
    // variantIndex) — een findFirst→create zou onder gelijktijdige writers
    // (dubbele generate, of race met POST /hero-image) een P2002 gooien die
    // de catch hieronder stil zou slikken, waardoor de rij ontbreekt terwijl
    // settings wél gepatcht zijn.
    await prisma.deliverableComponent.upsert({
      where: {
        deliverableId_variantGroup_variantIndex: {
          deliverableId,
          variantGroup: HERO_VARIANT_GROUP,
          variantIndex: 0,
        },
      },
      update: {
        imageUrl,
        imageSource: 'ai-generated',
        // Alt-tekst van een vorige (handmatige) keuze hoort niet bij het
        // nieuwe AI-beeld — expliciet wissen i.p.v. stale alt mee-hydrateren.
        visualBrief: null,
        isSelected: true,
        status: 'GENERATED',
        generatedAt: new Date(),
      },
      create: createData,
    });
  } catch (err) {
    console.error(
      '[upsertHeroImageComponent] faalde:',
      err instanceof Error ? err.message : err,
    );
  }
}
