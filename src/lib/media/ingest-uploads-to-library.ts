// =============================================================
// Convenience-wrapper rond importGeneratedImageToLibrary voor de
// content-item generate-routes (generate-visual / -trained / -compose).
//
// Centraliseert de id-keyed MediaCategory-resolutie én een leesbare
// default-naam (de display-naam van het deliverable-type i.p.v. de ruwe
// type-id) op één plek, en dedupliceert de ingest-loop die anders ~verbatim
// in drie routes stond.
// =============================================================

import type { MediaCategory } from "@prisma/client";
import { getDeliverableTypeById } from "@/features/campaigns/lib/deliverable-types";
import { importGeneratedImageToLibrary } from "@/lib/media/import-generated-image";
import { resolveMediaCategory } from "@/lib/media/resolve-media-category";

/**
 * MediaCategory voor een deliverable-type-id (= `Deliverable.contentType`,
 * bv. "blog-post"). Id-keyed lookup; onbekend/leeg → LIFESTYLE.
 */
export function mediaCategoryForDeliverableType(
  deliverableTypeId: string | null | undefined,
): MediaCategory {
  return resolveMediaCategory(getDeliverableTypeById(deliverableTypeId ?? "")?.category);
}

export interface LibraryUpload {
  url: string;
  fileSize: number;
  /** Echte mime van de upload; valt anders terug op `defaultContentType`. */
  contentType?: string;
}

export interface IngestUploadsOptions {
  workspaceId: string;
  uploadedById: string;
  /** Deliverable-type-id (= `Deliverable.contentType`), bv. "blog-post". */
  deliverableTypeId: string | null | undefined;
  /**
   * Doorzoekbare naam; leeg/weggelaten → de display-naam van het
   * deliverable-type (bv. "Blog Post"), anders "Gegenereerd beeld".
   */
  name?: string;
  /** Fallback-mime wanneer een upload zelf geen contentType meegeeft. */
  defaultContentType?: string;
}

/**
 * Groei de Media Library met de AI-gegenereerde uploads van één
 * content-item-generatie (#325-patroon). Resolved categorie + naam één keer
 * (id-keyed) en voidt elke import fire-and-forget zodat library-ingestie nooit
 * de generatie blokkeert of breekt.
 */
export function ingestUploadsToLibrary(
  uploads: LibraryUpload[],
  opts: IngestUploadsOptions,
): void {
  const type = getDeliverableTypeById(opts.deliverableTypeId ?? "");
  const category = resolveMediaCategory(type?.category);
  const name = opts.name?.trim() || type?.name || "Gegenereerd beeld";
  for (const u of uploads) {
    void importGeneratedImageToLibrary({
      workspaceId: opts.workspaceId,
      fileUrl: u.url,
      fileSize: u.fileSize,
      name,
      uploadedById: opts.uploadedById,
      category,
      contentType: u.contentType ?? opts.defaultContentType,
    });
  }
}
