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
  StartTrainingBody,
  TrainingStatusResponse,
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
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  const res = await fetch(`${BASE}/${modelId}/reference-images`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res, "Failed to upload reference images");
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

// ─── 9. Start Training ──────────────────────────────────────

export async function startTraining(
  modelId: string,
  config?: StartTrainingBody,
): Promise<{ status: string; astriaModelId: string | null }> {
  const res = await fetch(`${BASE}/${modelId}/train`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config ?? {}),
  });
  return handleResponse(res, "Failed to start training");
}

// ─── 10. Training Status ────────────────────────────────────

export async function fetchTrainingStatus(
  modelId: string,
): Promise<TrainingStatusResponse> {
  const res = await fetch(`${BASE}/${modelId}/training-status`);
  return handleResponse(res, "Failed to fetch training status");
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

// ─── 12. List Generations ───────────────────────────────────

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
