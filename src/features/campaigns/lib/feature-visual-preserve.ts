/**
 * Feature-visual clobber-guard (R9, Fase 5 audit 2026-06-10-lp-feature-
 * image-diversity) — pure helper naar het patroon van hero-visual-preserve.ts
 * (die file is eigendom van de lp-image-source-wiring workstream; bewust
 * gekopieerd patroon i.p.v. mutatie).
 *
 * Zelfde bug-klasse als de hero-clobber (gotchas 2026-06-08/09): een settings-
 * PATCH die puckData/structuredVariant wholesale vervangt (autosave, regen,
 * stale race) kon al-gezette feature-imageUrls stil leegmaken. Deze guard
 * behoudt NIET-lege feature-beelden wanneer de inkomende write ze leeg laat;
 * een nieuwe (vervangende) URL passeert altijd.
 *
 * BEWUSTE CLEAR (follow-up 2026-06-10): de "Verwijderen"-knop in
 * PuckImageField stuurt CLEAR_IMAGE_SENTINEL i.p.v. '' — een gewone lege
 * waarde kan een stale-race zijn (en wordt beschermd), de sentinel is een
 * expliciete user-intentie en passeert de guard. Bij persist normaliseert de
 * guard de sentinel naar '' zodat hij nooit in de opgeslagen tree belandt.
 */

/** Expliciete clear-intentie uit de Puck-editor — passeert de preserve-guard. */
export const CLEAR_IMAGE_SENTINEL = "__bd_clear_image__";

/** True wanneer de waarde de expliciete clear-sentinel is. */
export function isClearedImage(value: unknown): boolean {
  return value === CLEAR_IMAGE_SENTINEL;
}

interface PuckTreeLike {
  content?: Array<{ type?: string; props?: Record<string, unknown> } | null>;
}

interface FeatureLike {
  title?: string;
  imageUrl?: string | null;
  [key: string]: unknown;
}

const FEATURE_COMPONENT_TYPES = new Set(["FeatureGrid", "FeatureSplit"]);

function nonEmpty(url: unknown): url is string {
  return typeof url === "string" && url.trim().length > 0 && url !== CLEAR_IMAGE_SENTINEL;
}

/**
 * Behoud per feature-kaart een al-gezette imageUrl in de Puck-tree. Matching
 * is positioneel (component-index + feature-index) MET titel-gelijkheid als
 * extra slot — zo plakt een preserve nooit het verkeerde beeld op een
 * gereorderde/herschreven feature.
 */
export function preserveFeatureVisuals<T extends PuckTreeLike>(incoming: T, current: PuckTreeLike): T {
  if (!Array.isArray(incoming.content) || !Array.isArray(current.content)) return incoming;
  let changed = false;
  const content = incoming.content.map((c, ci) => {
    if (!c || !FEATURE_COMPONENT_TYPES.has(c.type ?? "")) return c;
    const cur = current.content?.[ci];
    // FeatureGrid ↔ FeatureSplit zijn equivalent: het type WISSELT op basis van
    // beeld-aanwezigheid (featuresSection rendert Split bij 4/4 beelden, Grid
    // anders) — een stale autosave van vóór de image-fill stuurt dus per
    // definitie het ándere type. Exacte type-match zou de guard precies in het
    // hoofd-clobber-scenario uitschakelen (review 2026-06-10). De titel-
    // gelijkheid per feature beschermt tegen verkeerd-overplakken.
    if (!cur || !FEATURE_COMPONENT_TYPES.has(cur.type ?? "")) return c;
    const incomingFeats = (c.props as { features?: FeatureLike[] } | undefined)?.features;
    const currentFeats = (cur.props as { features?: FeatureLike[] } | undefined)?.features;
    if (!Array.isArray(incomingFeats) || !Array.isArray(currentFeats)) return c;
    let featChanged = false;
    const features = incomingFeats.map((f, fi) => {
      // Expliciete clear-sentinel: user-intentie uit PuckImageField — niet
      // preserven én normaliseren naar '' zodat de sentinel nooit persist.
      if (f && isClearedImage(f.imageUrl)) {
        featChanged = true;
        return { ...f, imageUrl: "" };
      }
      const curF = currentFeats[fi];
      if (!curF || nonEmpty(f?.imageUrl) || !nonEmpty(curF.imageUrl)) return f;
      // Titel-gelijkheid voorkomt cross-feature contaminatie bij reorder.
      if ((f?.title ?? "") !== (curF.title ?? "")) return f;
      featChanged = true;
      return { ...f, imageUrl: curF.imageUrl };
    });
    if (!featChanged) return c;
    changed = true;
    return { ...c, props: { ...c.props, features } };
  });
  return changed ? ({ ...incoming, content } as T) : incoming;
}

interface StructuredVariantLike {
  features?: { items?: Array<{ heading?: string; imageUrl?: string | null; [key: string]: unknown }> };
  [key: string]: unknown;
}

/**
 * Server-side chokepoint-guard voor de studio-PATCH-route, naast
 * preserveHeroOnSettings. Dekt settings.puckData (FeatureGrid/FeatureSplit
 * features[].imageUrl) én settings.structuredVariant.features.items[].imageUrl.
 * Pure functie; retourneert de te-mergen incoming-kant.
 *
 * Gebruik: `preserveFeatureVisualsOnSettings(existing, preserveHeroOnSettings(existing, incoming))`.
 */
export function preserveFeatureVisualsOnSettings(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...incoming };

  if (
    incoming.puckData && typeof incoming.puckData === "object" &&
    existing.puckData && typeof existing.puckData === "object"
  ) {
    out.puckData = preserveFeatureVisuals(
      incoming.puckData as PuckTreeLike,
      existing.puckData as PuckTreeLike,
    );
  }

  const incSv = incoming.structuredVariant as StructuredVariantLike | undefined;
  const exSv = existing.structuredVariant as StructuredVariantLike | undefined;
  const incItems = incSv?.features?.items;
  const exItems = exSv?.features?.items;
  if (incSv && Array.isArray(incItems) && Array.isArray(exItems)) {
    let changed = false;
    const items = incItems.map((it, i) => {
      if (it && isClearedImage(it.imageUrl)) {
        changed = true;
        return { ...it, imageUrl: "" };
      }
      const exIt = exItems[i];
      if (!exIt || nonEmpty(it?.imageUrl) || !nonEmpty(exIt.imageUrl)) return it;
      if ((it?.heading ?? "") !== (exIt.heading ?? "")) return it;
      changed = true;
      return { ...it, imageUrl: exIt.imageUrl };
    });
    if (changed) {
      out.structuredVariant = { ...incSv, features: { ...incSv.features, items } };
    }
  }

  return out;
}
