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
 * Vervang CLEAR_IMAGE_SENTINEL door '' in álle feature-componenten van een
 * Puck-tree, onafhankelijk van alignment met de bestaande tree. Meldt de
 * geclearde titels via `onCleared` zodat de settings-guard de clear ook naar
 * structuredVariant kan spiegelen (anders resurrect een sv→puck rebuild het
 * gewiste beeld — review follow-ups 2026-06-10).
 */
function sweepClearSentinels<T extends PuckTreeLike>(
  tree: T,
  onCleared?: (title: string) => void,
  clearedPositions?: Set<string>,
): T {
  if (!Array.isArray(tree.content)) return tree;
  let changed = false;
  const content = tree.content.map((c, ci) => {
    if (!c || !FEATURE_COMPONENT_TYPES.has(c.type ?? "")) return c;
    const feats = (c.props as { features?: FeatureLike[] } | undefined)?.features;
    if (!Array.isArray(feats)) return c;
    let featChanged = false;
    const features = feats.map((f, fi) => {
      if (!f || !isClearedImage(f.imageUrl)) return f;
      featChanged = true;
      onCleared?.(typeof f.title === "string" ? f.title : "");
      clearedPositions?.add(`${ci}:${fi}`);
      return { ...f, imageUrl: "" };
    });
    if (!featChanged) return c;
    changed = true;
    return { ...c, props: { ...c.props, features } };
  });
  return changed ? ({ ...tree, content } as T) : tree;
}

/**
 * Behoud per feature-kaart een al-gezette imageUrl in de Puck-tree. Matching
 * is positioneel (component-index + feature-index) MET titel-gelijkheid als
 * extra slot — zo plakt een preserve nooit het verkeerde beeld op een
 * gereorderde/herschreven feature.
 */
export function preserveFeatureVisuals<T extends PuckTreeLike>(
  incoming: T,
  current: PuckTreeLike,
  onCleared?: (title: string) => void,
): T {
  // Sentinel-sweep VÓÓR de alignment-guards: ook bij tree-misalignment
  // (sectie-reorder binnen het autosave-window) mag de magic string nooit
  // rauw persist (review follow-ups 2026-06-10).
  const clearedPositions = new Set<string>();
  const swept = sweepClearSentinels(incoming, onCleared, clearedPositions);
  const sweptContent = swept.content;
  if (!Array.isArray(sweptContent) || !Array.isArray(current.content)) return swept;
  let changed = false;
  const content = sweptContent.map((c, ci) => {
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
      // Een zojuist geveegde clear is user-intentie — niet "herstellen".
      if (clearedPositions.has(`${ci}:${fi}`)) return f;
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
  // Basis is altijd de GEVEEGDE tree: een clear-only patch (geen preserves,
  // changed=false) mag nooit de ongeveegde sentinel-tree teruggeven.
  return changed ? ({ ...swept, content } as T) : swept;
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

  const clearedTitles = new Set<string>();
  if (incoming.puckData && typeof incoming.puckData === "object") {
    out.puckData = preserveFeatureVisuals(
      incoming.puckData as PuckTreeLike,
      (existing.puckData && typeof existing.puckData === "object" ? existing.puckData : {}) as PuckTreeLike,
      (title) => clearedTitles.add(title),
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

  // Clear-spiegeling naar structuredVariant: de autosave stuurt alleen
  // puckData; zonder sync houdt sv de oude URL en brengt elke sv→puck-rebuild
  // (hero-knop Step 3, regenerate-puck-data) het gewiste beeld terug —
  // chokepoint-sync naar het syncHeroFromPuck-precedent.
  if (clearedTitles.size > 0) {
    const svSource = (out.structuredVariant ?? incoming.structuredVariant ?? existing.structuredVariant) as StructuredVariantLike | undefined;
    const svItems = svSource?.features?.items;
    if (svSource && Array.isArray(svItems)) {
      let svChanged = false;
      const items = svItems.map((it) => {
        if (!it || !nonEmpty(it.imageUrl)) return it;
        if (!clearedTitles.has(typeof it.heading === "string" ? it.heading : "")) return it;
        svChanged = true;
        return { ...it, imageUrl: "" };
      });
      if (svChanged) {
        out.structuredVariant = { ...svSource, features: { ...svSource.features, items } };
      }
    }
  }

  return out;
}
