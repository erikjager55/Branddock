// =============================================================
// Consistent Models API Client
// =============================================================

import type {
  ConsistentModelListResponse,
  ConsistentModelListParams,
  ConsistentModelDetail,
  CreateModelBody,
  UpdateModelBody,
  GenerateImageBody,
  GenerationsListResponse,
  GenerationsListParams,
  ReferenceImageWithMeta,
  UploadReferenceImagesResponse,
  GeneratedImageWithMeta,
} from "../types/consistent-model.types";

const BASE = "/api/consistent-models";

// ─── Helpers ────────────────────────────────────────────────

async function handleResponse<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `${label} (${res.status})`);
  }
  return res.json();
}

// ─── 1. List Models ─────────────────────────────────────────

export async function fetchConsistentModels(
  params?: ConsistentModelListParams,
): Promise<ConsistentModelListResponse> {
  const url = new URL(BASE, window.location.origin);
  if (params?.type) url.searchParams.set("type", params.type);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.search) url.searchParams.set("search", params.search);
  if (params?.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params?.sortOrder) url.searchParams.set("sortOrder", params.sortOrder);

  const res = await fetch(url.toString());
  return handleResponse(res, "Failed to fetch models");
}

// ─── 2. Model Detail ────────────────────────────────────────

export async function fetchConsistentModelDetail(
  id: string,
): Promise<ConsistentModelDetail> {
  const res = await fetch(`${BASE}/${id}`);
  return handleResponse(res, "Failed to fetch model detail");
}

// ─── 3. Create Model ────────────────────────────────────────

export async function createConsistentModel(
  body: CreateModelBody,
): Promise<ConsistentModelDetail> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(res, "Failed to create model");
}

// ─── 4. Update Model ────────────────────────────────────────

export async function updateConsistentModel(
  id: string,
  body: UpdateModelBody,
): Promise<ConsistentModelDetail> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(res, "Failed to update model");
}

// ─── 5. Delete Model ────────────────────────────────────────

export async function deleteConsistentModel(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to delete model (${res.status})`);
  }
}

// ─── 6. Upload Reference Images ─────────────────────────────

export async function uploadReferenceImages(
  modelId: string,
  files: File[],
): Promise<UploadReferenceImagesResponse> {
  // Eén bestand per request: alles in één formData botste op de ±4,5MB
  // serverless-request-limiet van prod. Eén geweigerd bestand (bv. model op
  // max 20, te klein, te groot) mag de rest niet blokkeren: fouten worden
  // per bestand verzameld en de geslaagde uploads blijven staan. Alleen als
  // álles faalt, gooit de functie — met de serverfout als boodschap.
  const uploaded: UploadReferenceImagesResponse["uploaded"] = [];
  const errors: UploadReferenceImagesResponse["errors"] = [];
  let total = 0;

  for (const file of files) {
    const formData = new FormData();
    formData.append("images", file);

    try {
      const res = await fetch(`${BASE}/${modelId}/reference-images`, {
        method: "POST",
        body: formData,
      });
      const body = (await res.json().catch(() => null)) as
        | (Partial<UploadReferenceImagesResponse> & { error?: string })
        | null;

      if (body && Array.isArray(body.uploaded) && Array.isArray(body.errors)) {
        // Zowel 201 als 400-met-details heeft deze vorm — de server geeft
        // per bestand de echte weigerreden mee (te klein, te groot, corrupt).
        uploaded.push(...body.uploaded);
        errors.push(...body.errors);
        if (typeof body.total === "number") total = body.total;
      } else if (!res.ok) {
        errors.push({
          fileName: file.name,
          error: body?.error ?? `Upload failed (${res.status})`,
        });
      }
    } catch (err) {
      errors.push({
        fileName: file.name,
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  if (files.length > 0 && uploaded.length === 0) {
    throw new Error(errors[0]?.error ?? "No files uploaded");
  }
  return { uploaded, errors, total };
}

// ─── 7. Delete Reference Image ──────────────────────────────

export async function deleteReferenceImage(
  modelId: string,
  imageId: string,
): Promise<void> {
  const res = await fetch(`${BASE}/${modelId}/reference-images/${imageId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to delete reference image (${res.status})`);
  }
}

export async function updateReferenceImageCaption(
  modelId: string,
  imageId: string,
  caption: string,
): Promise<void> {
  const res = await fetch(`${BASE}/${modelId}/reference-images/${imageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caption }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to update caption (${res.status})`);
  }
}

// ─── 8. Reorder Reference Images ────────────────────────────

export async function reorderReferenceImages(
  modelId: string,
  imageIds: string[],
): Promise<{ images: ReferenceImageWithMeta[] }> {
  const res = await fetch(`${BASE}/${modelId}/reference-images/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageIds }),
  });
  return handleResponse(res, "Failed to reorder reference images");
}

// ─── 11. Generate Image ─────────────────────────────────────

export async function generateImage(
  modelId: string,
  body: GenerateImageBody,
): Promise<{ generations: GeneratedImageWithMeta[] }> {
  const res = await fetch(`${BASE}/${modelId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(res, "Failed to generate image");
}

// ─── 12. Refresh Brand Context ─────────────────────────────

export async function refreshBrandContext(
  modelId: string,
): Promise<ConsistentModelDetail> {
  const res = await fetch(`${BASE}/${modelId}/refresh-context`, {
    method: "POST",
  });
  return handleResponse(res, "Failed to refresh brand context");
}

// ─── 13. Generate Reference Images ─────────────────────────

export async function generateReferenceImages(
  modelId: string,
  options: {
    falModel: string;
    count?: number;
    brandTags: string[];
    typeConfig: Record<string, string>;
  },
): Promise<{ images: ReferenceImageWithMeta[] }> {
  const res = await fetch(`${BASE}/${modelId}/generate-references`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  return handleResponse(res, "Failed to generate reference images");
}

// ─── 14. Curate Reference Images ───────────────────────────

export async function curateReferenceImages(
  modelId: string,
  selectedIds: string[],
  deselectedIds: string[],
  captions?: Record<string, string>,
): Promise<{ images: ReferenceImageWithMeta[]; trainingCount: number; total: number }> {
  const res = await fetch(`${BASE}/${modelId}/curate-references`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedIds, deselectedIds, captions }),
  });
  return handleResponse(res, "Failed to curate reference images");
}

// ─── 15. Analyze Illustration Style ────────────────────────

export async function analyzeModelStyle(
  modelId: string,
): Promise<{ profile: import("@/lib/consistent-models/style-profile.types").IllustrationStyleProfile }> {
  const res = await fetch(`${BASE}/${modelId}/analyze-style`, {
    method: "POST",
  });
  return handleResponse(res, "Failed to analyze illustration style");
}

// ─── 16. List Generations ───────────────────────────────────

export async function fetchGenerations(
  modelId: string,
  params?: GenerationsListParams,
): Promise<GenerationsListResponse> {
  const url = new URL(`${BASE}/${modelId}/generations`, window.location.origin);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.offset) url.searchParams.set("offset", String(params.offset));

  const res = await fetch(url.toString());
  return handleResponse(res, "Failed to fetch generations");
}
