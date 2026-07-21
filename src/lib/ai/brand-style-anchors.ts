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
import { resolveStorageUrl } from '@/lib/storage/resolve-storage-url';
import { fetchWithSizeLimit, AI_IMAGE_SIZE_CAP } from '@/lib/security/fetch-with-limit';
import { prepareJudgeImage } from '@/lib/brand-fidelity/judge-image';
import { detectLogoInImage, type LogoProminence } from '@/lib/visual/detect-logo-in-image';

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
    // Resolve fileUrl naar een nú-bereikbare vorm: opgeslagen signed R2-URLs
    // verlopen na 1 uur — fal/vision kan ze dan niet downloaden.
    const hydrated = await Promise.all(
      anchorIds
        .map((id) => assetMap.get(id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
        .map(async (a) => ({
          mediaAssetId: a.id,
          fileUrl: await resolveStorageUrl(a.fileUrl),
          alt: a.name ?? null,
        })),
    );
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

// ─── W5 L-Fase 3 — anchor-curatie (plan §5 T2) ───────────────

export interface AnchorLogoFinding {
  mediaAssetId: string;
  alt: string | null;
  visibleLogo: boolean;
  prominence: LogoProminence;
  rationale: string;
}

export interface AnchorLogoAudit {
  /** Per-anchor bevinding; alleen anchors die gejudged konden worden. */
  findings: AnchorLogoFinding[];
  /** Aantal anchors waarvan een logo het beeld DOMINEERT — de T2-risicogroep. */
  dominantCount: number;
  /** Aantal anchors waar überhaupt een logo zichtbaar is. */
  visibleCount: number;
  /** User-gerichte waarschuwing (NL) wanneer ≥1 dominante logo-anchor; anders null. */
  warning: string | null;
}

/**
 * Pure samenvatting van per-anchor logo-detecties → audit + waarschuwing.
 * Geëxporteerd zodat de drempel-/copy-logica unit-smokebaar is zonder een
 * echte vision-call. Een DOMINANT logo op een style-anchor is het defect dat
 * prompt-fixes niet kunnen dichten (multi-ref-fusion kopieert het mark terug).
 */
export function summarizeAnchorLogoAudit(findings: AnchorLogoFinding[]): AnchorLogoAudit {
  const dominantCount = findings.filter((f) => f.prominence === 'dominant').length;
  const visibleCount = findings.filter((f) => f.visibleLogo).length;
  const warning = dominantCount > 0
    ? `${dominantCount} van je ${findings.length} brand-style-anchors tonen een prominent logo. Die referentiebeelden leren het AI-model dat logo na te maken (vaak verminkt) in elke generatie — dit is niet met prompts te voorkomen. Vervang deze anchors door beeld zonder logo voor schone resultaten.`
    : null;
  return { findings, dominantCount, visibleCount, warning };
}

/**
 * Audit de brand-style-anchors van een workspace op zichtbare/dominante logo's
 * (plan §5 T2). On-demand bedoeld (1 Haiku-vision-call per anchor) — NIET per
 * generatie. Anchors die niet gejudged kunnen worden (geen API-key, laad-fout)
 * vallen stil weg uit de findings. Gooit niet.
 */
export async function auditStyleAnchorsForLogos(workspaceId: string): Promise<AnchorLogoAudit> {
  const anchors = await fetchBrandStyleAnchors(workspaceId);
  const findings = await Promise.all(
    anchors.map(async (anchor): Promise<AnchorLogoFinding | null> => {
      try {
        const bytes = anchor.fileUrl.startsWith('/')
          ? await (await import('fs/promises')).readFile(
              (await import('path')).join('public', anchor.fileUrl.replace(/^\//, '')),
            )
          : await fetchWithSizeLimit(anchor.fileUrl, AI_IMAGE_SIZE_CAP);
        const prepared = await prepareJudgeImage(bytes);
        const result = await detectLogoInImage({
          type: 'base64',
          mediaType: prepared.mediaType,
          data: prepared.buffer.toString('base64'),
        });
        if (!result) return null;
        return {
          mediaAssetId: anchor.mediaAssetId,
          alt: anchor.alt,
          visibleLogo: result.visibleLogo,
          prominence: result.prominence,
          rationale: result.rationale,
        };
      } catch (err) {
        console.warn(
          `[brand-style-anchors] logo-audit anchor ${anchor.mediaAssetId} faalde — overslaan:`,
          err instanceof Error ? err.message : err,
        );
        return null;
      }
    }),
  );
  return summarizeAnchorLogoAudit(findings.filter((f): f is AnchorLogoFinding => f !== null));
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
