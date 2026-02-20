import type {
  PersonaWithMeta,
  PersonaStats,
  CreatePersonaBody,
  UpdatePersonaBody,
  ResearchMethodSummary,
} from "../types/persona.types";

const BASE = "/api/personas";

// ─── List + Stats ──────────────────────────────────────────

export async function fetchPersonas(
  search?: string,
  filter?: string,
): Promise<{ personas: PersonaWithMeta[]; stats: PersonaStats }> {
  const url = new URL(BASE, window.location.origin);
  if (search) url.searchParams.set("search", search);
  if (filter && filter !== "all") url.searchParams.set("filter", filter);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch personas");
  return res.json();
}

// ─── CRUD ──────────────────────────────────────────────────

export async function createPersona(
  data: CreatePersonaBody,
): Promise<{ persona: PersonaWithMeta }> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create persona");
  return res.json();
}

export async function fetchPersonaDetail(
  id: string,
): Promise<PersonaWithMeta> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error("Failed to fetch persona detail");
  return res.json();
}

export async function updatePersona(
  id: string,
  data: UpdatePersonaBody,
): Promise<{ persona: PersonaWithMeta }> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update persona");
  return res.json();
}

export async function deletePersona(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete persona");
  return res.json();
}

// ─── Actions ───────────────────────────────────────────────

export async function duplicatePersona(
  id: string,
): Promise<{ persona: PersonaWithMeta }> {
  const res = await fetch(`${BASE}/${id}/duplicate`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to duplicate persona");
  return res.json();
}

export async function togglePersonaLock(
  id: string,
  locked: boolean,
): Promise<{ persona: PersonaWithMeta }> {
  const res = await fetch(`${BASE}/${id}/lock`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locked }),
  });
  if (!res.ok) throw new Error("Failed to toggle lock");
  return res.json();
}

export async function updateAvatar(
  id: string,
  avatarUrl: string,
  source: string,
): Promise<{ persona: PersonaWithMeta }> {
  const res = await fetch(`${BASE}/${id}/avatar`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ avatarUrl, source }),
  });
  if (!res.ok) throw new Error("Failed to update avatar");
  return res.json();
}

export async function generatePersonaImage(
  id: string,
): Promise<{ avatarUrl: string }> {
  const res = await fetch(`${BASE}/${id}/generate-image`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to generate image");
  return res.json();
}

export async function regeneratePersona(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}/regenerate`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to regenerate persona");
}

export async function generateStrategicImplications(
  id: string,
): Promise<{ strategicImplications: string }> {
  const res = await fetch(`${BASE}/${id}/strategic-implications`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to generate strategic implications");
  return res.json();
}

export async function updateResearchMethod(
  id: string,
  method: string,
  data: { status: string; progress?: number },
): Promise<{ method: ResearchMethodSummary; validationPercentage: number }> {
  const res = await fetch(`${BASE}/${id}/research-methods/${method}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update research method");
  return res.json();
}
