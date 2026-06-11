// =============================================================
// Import van AI-gegenereerde beelden naar de Media Library
// (follow-up lp-library-first-matching, 2026-06-11).
//
// Definitieve winnaars uit de feature-visual-pipeline worden als
// MediaAsset geregistreerd zodat de bibliotheek organisch groeit:
// de dam-auto-tagger (fire-and-forget op creatie) levert beschrijving
// + tags + pgvector-embedding, waarna de library-first matcher het
// beeld bij een volgende pagina kan hergebruiken i.p.v. opnieuw te
// genereren. Echte foto's houden voorrang via de PHOTO_REAL-boost;
// de coherence-poort (fail-closed) blijft de kwaliteitsgrens.
//
// Fail-soft: een import-fout mag een generatie-run nooit raken.
// =============================================================

import { prisma } from "@/lib/prisma";
import { tagMediaAssetIfPossible } from "@/lib/ai/dam-auto-tagger";

/** sceneType (imageBrief) → MediaCategory voor doorzoekbaarheid. */
const SCENE_TO_CATEGORY: Record<string, "PRODUCT_PHOTO" | "LIFESTYLE"> = {
  object: "PRODUCT_PHOTO",
  detail: "PRODUCT_PHOTO",
  process: "LIFESTYLE",
  person: "LIFESTYLE",
  location: "LIFESTYLE",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "generated-image";
}

export interface ImportGeneratedImageOptions {
  workspaceId: string;
  fileUrl: string;
  fileSize: number;
  /** Doorzoekbare naam — bij voorkeur het brief-subject. */
  name: string;
  sceneType?: string | null;
  uploadedById: string;
}

/**
 * Registreer een gegenereerd beeld als MediaAsset (source AI_GENERATED) en
 * trigger de tagger-keten (beschrijving → embedding). aiTags blijft leeg
 * zodat de tagger de volledige vision-analyse draait — die levert ook de
 * `auth:AI_GENERATED`-tag waarmee de matcher echte foto's voorrang geeft.
 *
 * Bewuste consequentie: bij her-generatie van dezelfde pagina kan de matcher
 * een eerder gegenereerd beeld als library-match teruggeven (gewenst
 * hergebruik, $0). Wie een slot écht vers wil, vervangt via de picker of
 * archiveert het asset — de coherence-poort blijft de kwaliteitsgrens.
 */
export async function importGeneratedImageToLibrary(
  opts: ImportGeneratedImageOptions,
): Promise<void> {
  try {
    const fileName = opts.fileUrl.split("/").pop() ?? "generated.png";
    // Slug-suffix uit de upload-bestandsnaam (bevat al timestamp+slotindex,
    // uniek per upload) — geen uniqueness-roundtrip nodig; de
    // @@unique([workspaceId, slug])-constraint vangt de rest (fail-soft).
    const suffix = fileName.replace(/\.[a-z]+$/i, "").split("-").slice(-2).join("-") || Date.now().toString(36);
    const slug = `${slugify(opts.name)}-${suffix}`.slice(0, 90);
    const asset = await prisma.mediaAsset.create({
      data: {
        name: opts.name.slice(0, 120),
        slug,
        fileUrl: opts.fileUrl,
        fileType: "image/png",
        fileSize: opts.fileSize,
        fileName,
        mediaType: "IMAGE",
        category: SCENE_TO_CATEGORY[opts.sceneType ?? ""] ?? "LIFESTYLE",
        source: "AI_GENERATED",
        aiTags: [],
        workspaceId: opts.workspaceId,
        uploadedById: opts.uploadedById,
      },
      select: { id: true },
    });
    // Tagger is zelf al fire-and-forget richting embedding; hier awaiten we
    // 'm niet — de caller voidt deze hele functie.
    void tagMediaAssetIfPossible(asset.id);
  } catch (err) {
    console.warn(
      "[import-generated-image] library-import faalde (non-blocking):",
      err instanceof Error ? err.message : err,
    );
  }
}
