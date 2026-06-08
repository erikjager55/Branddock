/**
 * Pure helper, los van de client-component zodat hij testbaar is (PuckPageBuilder
 * importeert client-only modules + CSS → niet importeerbaar in een tsx-smoke).
 *
 * Root-cause-fix orphaned-hero (audit 2026-06-08): na een geslaagde
 * hero-generatie/self-heal race'te de /context-refetch de net-gezette
 * `heroVisualUrl` eruit — de inkomende (stale) puckData had de BrandHero nog
 * ZONDER beeld, en het re-hydrate-effect overschreef de lokale (gevulde) tree.
 */

/** Minimale structurele vorm — vermijdt import van de Puck-types (client-only). */
export interface PuckTreeLike {
  content?: Array<{ type?: string; props?: Record<string, unknown> } | null>;
}

function heroUrlOf(tree: PuckTreeLike): string | undefined {
  if (!Array.isArray(tree.content)) return undefined;
  const hero = tree.content.find((c) => c?.type === 'BrandHero');
  const url = (hero?.props as { heroVisualUrl?: string } | undefined)?.heroVisualUrl;
  return typeof url === 'string' && url.trim() ? url : undefined;
}

/**
 * Behoudt een al-gewirede hero-image wanneer de inkomende puckData de BrandHero
 * leeg heeft. Alleen non-leeg → leeg wordt beschermd: een nieuwe inkomende URL
 * én een echte clear (beide leeg) passeren ongemoeid.
 */
export function preserveHeroVisual<T extends PuckTreeLike>(incoming: T, current: PuckTreeLike): T {
  if (!Array.isArray(incoming.content) || !Array.isArray(current.content)) return incoming;
  const currentUrl = heroUrlOf(current);
  if (!currentUrl) return incoming;
  let changed = false;
  const content = incoming.content.map((c) => {
    if (c?.type !== 'BrandHero') return c;
    const incomingUrl = (c.props as { heroVisualUrl?: string } | undefined)?.heroVisualUrl;
    if (typeof incomingUrl === 'string' && incomingUrl.trim()) return c; // inkomende heeft eigen beeld
    changed = true;
    return { ...c, props: { ...c.props, heroVisualUrl: currentUrl } };
  });
  return changed ? ({ ...incoming, content } as T) : incoming;
}
