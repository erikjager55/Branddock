// =============================================================
// F40 (audit 2026-05-13): Brand-style anchor set helpers
// =============================================================
// Workspace heeft 3-10 MediaAsset IDs als "brand visual anchors".
// Elke image-generation injecteert deze als style-reference voor:
//   - Recraft V4 style-ID (max 5 refs)
//   - Nano Banana fusion (max 14 refs)
//   - FLUX 2 reference-input (max 5 refs, indien ondersteund)
//
// Anchors zijn workspace-niveau (niet per-deliverable) zodat brand-
// look consistent blijft over alle content-items zonder per-item
// configuratie.
// =============================================================

import { prisma } from '@/lib/prisma';

export interface BrandStyleAnchor {
  mediaAssetId: string;
  fileUrl: string;
  alt: string | null;
}

/**
 * Fetch the workspace's brand-style anchor images. Returns hydrated
 * MediaAsset records (with URLs) ordered as configured.
 * Returns [] when geen anchors zijn ingesteld of er silent een
 * MediaAsset is verwijderd (we filteren orphan-IDs eruit).
 */
export async function fetchBrandStyleAnchors(
  workspaceId: string,
): Promise<BrandStyleAnchor[]> {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { brandStyleAnchorIds: true },
    });
    const anchorIds = workspace?.brandStyleAnchorIds ?? [];
    if (anchorIds.length === 0) return [];

    const assets = await prisma.mediaAsset.findMany({
      where: { id: { in: anchorIds }, workspaceId },
      select: { id: true, fileUrl: true, name: true },
    });

    // Preserve original order from anchorIds; filter out anchors die niet
    // meer bestaan (asset deleted).
    const assetMap = new Map(assets.map((a) => [a.id, a]));
    const hydrated = anchorIds
      .map((id) => assetMap.get(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => ({
        mediaAssetId: a.id,
        fileUrl: a.fileUrl,
        alt: a.name ?? null,
      }));
    // Orphans falen anders silent naar [] terwijl de user denkt dat anchors
    // actief zijn (Napking: 10/10 orphaned — audit 2026-06-10).
    if (hydrated.length < anchorIds.length) {
      console.warn(
        `[brand-style-anchors] workspace ${workspaceId}: ${anchorIds.length - hydrated.length}/${anchorIds.length} anchor-ids verwijzen naar verwijderde MediaAssets — opschonen via brand-styleguide instellingen`,
      );
    }
    return hydrated;
  } catch (err) {
    console.warn(
      '[brand-style-anchors] fetch failed (non-blocking):',
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

/**
 * Slice anchors per-model limiet.
 *  - Nano Banana Pro / fusion: 14
 *  - Recraft V4: 5
 *  - FLUX 2: 5 (multi-ref)
 *  - other: 0 (geen support)
 */
export function maxAnchorsForModel(modelId: string): number {
  if (modelId.includes('nano-banana')) return 14;
  if (modelId.includes('recraft')) return 5;
  if (modelId.includes('flux-2')) return 5;
  return 0;
}
