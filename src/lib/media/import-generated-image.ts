// =============================================================
// Import van AI-gegenereerde beelden naar de Media Library
// (follow-up lp-library-first-matching, 2026-06-11).
//
// Definitieve winnaars uit de feature-visual-pipeline én alle vanuit een
// content-item gegenereerde beelden (generate-visual / -trained / -compose /
// refine-visual / edit-image) worden als MediaAsset geregistreerd zodat de
// bibliotheek organisch groeit: de dam-auto-tagger (fire-and-forget op
// creatie) levert beschrijving + tags + pgvector-embedding, waarna de
// library-first matcher het beeld bij een volgende pagina kan hergebruiken
// i.p.v. opnieuw te genereren. Echte foto's houden voorrang via de
// PHOTO_REAL-boost; de coherence-poort (fail-closed) blijft de kwaliteitsgrens.
//
// Voor de multi-upload generate-routes: gebruik de wrapper
// ingestUploadsToLibrary (centrale categorie-resolutie + loop).
//
// Fail-soft: een import-fout mag een generatie-run nooit raken.
// =============================================================

import { prisma } from "@/lib/prisma";
import { tagMediaAssetIfPossible } from "@/lib/ai/dam-auto-tagger";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { getStorageProvider } from "@/lib/storage";
import type { MediaCategory } from "@prisma/client";

/** sceneType (imageBrief) → MediaCategory voor doorzoekbaarheid. */
const SCENE_TO_CATEGORY: Record<string, MediaCategory> = {
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
  /**
   * Expliciete MediaCategory voor bronnen zonder `sceneType` (content-items).
   * Een gemapte `sceneType` wint; anders wordt deze gebruikt; ontbreekt beide
   * dan valt het terug op LIFESTYLE.
   */
  category?: MediaCategory;
  /** Echte mime van het bestand (image/jpeg of image/png); default png. */
  contentType?: string;
  /**
   * Wanneer gezet: verwijder eerst een eerder met dezelfde sleutel
   * geïmporteerd asset (zelfde content-item-slot) en stempel die sleutel op
   * de nieuwe als `sourceUrl`. Zo levert herhaald verfijnen van één component
   * één — de meest recente — library-asset op i.p.v. één per iteratie.
   */
  replaceBySourceUrl?: string;
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
    // Replace-per-slot in één transactie: bij een create-fout rolt de delete
    // terug zodat het bestaande slot-asset niet zonder vervanging verdwijnt.
    // (Een zeldzame cross-transactie-race bij twee gelijktijdige refines van
    // hetzelfde component herstelt zich bij de volgende refine.)
    const { id: assetId, replacedBlobs } = await prisma.$transaction(async (tx) => {
      let replacedBlobs: { fileUrl: string; thumbnailUrl: string | null }[] = [];
      if (opts.replaceBySourceUrl) {
        replacedBlobs = await tx.mediaAsset.findMany({
          where: { workspaceId: opts.workspaceId, sourceUrl: opts.replaceBySourceUrl },
          select: { fileUrl: true, thumbnailUrl: true },
        });
        await tx.mediaAsset.deleteMany({
          where: { workspaceId: opts.workspaceId, sourceUrl: opts.replaceBySourceUrl },
        });
      }
      const created = await tx.mediaAsset.create({
        data: {
          name: opts.name.slice(0, 120),
          slug,
          fileUrl: opts.fileUrl,
          fileType: opts.contentType ?? "image/png",
          fileSize: opts.fileSize,
          fileName,
          mediaType: "IMAGE",
          // sceneType wint zodat feature-visuals zijn PRODUCT_PHOTO/LIFESTYLE-
          // mapping houdt; content-items zonder sceneType vallen op `category`.
          category: SCENE_TO_CATEGORY[opts.sceneType ?? ""] ?? opts.category ?? "LIFESTYLE",
          source: "AI_GENERATED",
          sourceUrl: opts.replaceBySourceUrl,
          aiTags: [],
          workspaceId: opts.workspaceId,
          uploadedById: opts.uploadedById,
        },
        select: { id: true },
      });
      return { id: created.id, replacedBlobs };
    });
    // Tagger is zelf al fire-and-forget richting embedding; hier awaiten we
    // 'm niet — de caller voidt deze hele functie.
    void tagMediaAssetIfPossible(assetId);
    // Verse asset direct zichtbaar maken in een al-geopende Media Library-tab
    // (de tagger/embedding schrijven later async, zonder eigen invalidatie).
    invalidateCache(cacheKeys.prefixes.media(opts.workspaceId));
    // Best-effort blob-cleanup van vervangen assets (ná tagger/invalidate zodat
    // de library direct refresht; buiten de transactie, fail-soft — gelijk aan
    // de reguliere media-delete). Voorkomt orphan-blobs bij herhaald verfijnen.
    if (replacedBlobs.length > 0) {
      const storage = getStorageProvider();
      for (const b of replacedBlobs) {
        await storage.delete(b.fileUrl).catch(() => {});
        if (b.thumbnailUrl) await storage.delete(b.thumbnailUrl).catch(() => {});
      }
    }
  } catch (err) {
    console.warn(
      "[import-generated-image] library-import faalde (non-blocking):",
      err instanceof Error ? err.message : err,
    );
  }
}
