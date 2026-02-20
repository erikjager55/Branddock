import type {
  ResourceWithMeta,
  ResourceDetailResponse,
  ResourceListParams,
  ResourceListResponse,
  FeaturedListResponse,
  CreateResourceBody,
  ImportUrlBody,
  ImportUrlResponse,
} from "../types/knowledge-library.types";
import type { ResourceType } from "@prisma/client";

const BASE = "/api/knowledge-resources";

export async function fetchResources(
  params?: ResourceListParams
): Promise<ResourceListResponse> {
  const sp = new URLSearchParams();
  if (params?.search) sp.set("search", params.search);
  if (params?.type) sp.set("type", params.type);
  if (params?.category) sp.set("category", params.category);
  if (params?.isArchived !== undefined) sp.set("isArchived", String(params.isArchived));
  const qs = sp.toString();
  const res = await fetch(`${BASE}${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch resources");
  return res.json();
}

export async function fetchFeaturedResources(): Promise<FeaturedListResponse> {
  const res = await fetch(`${BASE}/featured`);
  if (!res.ok) throw new Error("Failed to fetch featured resources");
  return res.json();
}

export async function fetchResourceDetail(id: string): Promise<ResourceDetailResponse> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error("Failed to fetch resource detail");
  return res.json();
}

export async function createResource(body: CreateResourceBody): Promise<ResourceWithMeta> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create resource");
  return res.json();
}

export async function updateResource(
  id: string,
  body: Partial<CreateResourceBody>
): Promise<ResourceDetailResponse> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update resource");
  return res.json();
}

export async function deleteResource(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete resource");
}

export async function toggleArchive(id: string): Promise<ResourceWithMeta> {
  const res = await fetch(`${BASE}/${id}/archive`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to toggle archive");
  return res.json();
}

export async function toggleFavorite(id: string): Promise<ResourceWithMeta> {
  const res = await fetch(`${BASE}/${id}/favorite`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to toggle favorite");
  return res.json();
}

export async function toggleFeatured(id: string): Promise<ResourceWithMeta> {
  const res = await fetch(`${BASE}/${id}/featured`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to toggle featured");
  return res.json();
}

export async function importUrl(body: ImportUrlBody): Promise<ImportUrlResponse> {
  const res = await fetch(`${BASE}/import-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to import URL");
  return res.json();
}

export async function uploadFile(file: File): Promise<ResourceWithMeta> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload file");
  return res.json();
}

export async function fetchResourceTypes(): Promise<ResourceType[]> {
  const res = await fetch(`${BASE}/types`);
  if (!res.ok) throw new Error("Failed to fetch resource types");
  return res.json();
}

export async function fetchResourceCategories(): Promise<string[]> {
  const res = await fetch(`${BASE}/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}
