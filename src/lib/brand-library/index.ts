// =============================================================
// Brand Library accessor (designbibliotheek-verbeterplan W7)
//
// Het verplichte consumptiepad voor merkcontext: consumers vragen de
// bibliotheek op via getBrandLibrary(workspaceId, { view }) i.p.v. zelf
// BrandStyleguide-velden te lezen. Gates (published), provenance-
// filtering en compressie-per-kanaal zitten daarmee op één plek —
// de bugklasse "consumer leest langs de save-for-AI-gate om"
// (gotchas 2026-06-11) kan hier structureel niet meer ontstaan.
// =============================================================

import { prisma } from '@/lib/prisma';
import {
  renderBrandManifestMarkdown,
  type BrandManifest,
} from '@/lib/brandstyle/manifest-builder';
import { projectManifest, type BrandLibraryView } from './views';

export { projectManifest } from './views';
export type { BrandLibraryView } from './views';

export interface BrandLibraryResult {
  workspaceId: string;
  view: BrandLibraryView;
  /**
   * Contract-versie (W7.3): consumers stempelen deze op gegenereerde
   * artefacten zodat drift auditbaar is ("gemaakt met bibliotheek v3").
   */
  manifestVersion: number;
  manifest: BrandManifest;
  /** Markdown-render van de geprojecteerde view — direct injecteerbaar. */
  markdown: string;
}

/**
 * Haal de gepubliceerde brand library op voor één workspace, geprojecteerd
 * op een channel-view. Retourneert null wanneer er geen styleguide is,
 * geen manifest gegenereerd is, of de styleguide niet gepubliceerd is —
 * de publish-gate geldt hier onvoorwaardelijk.
 */
export async function getBrandLibrary(
  workspaceId: string,
  options: { view?: BrandLibraryView } = {},
): Promise<BrandLibraryResult | null> {
  const view = options.view ?? 'full';
  const styleguide = await prisma.brandStyleguide.findUnique({
    where: { workspaceId },
    select: { brandManifest: true, manifestVersion: true, published: true },
  });
  if (!styleguide?.published || !styleguide.brandManifest) return null;

  const full = styleguide.brandManifest as unknown as BrandManifest;
  const projected = projectManifest(full, view);
  return {
    workspaceId,
    view,
    manifestVersion: styleguide.manifestVersion,
    manifest: projected,
    markdown: renderBrandManifestMarkdown(projected),
  };
}
