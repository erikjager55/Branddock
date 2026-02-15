import type { Persona, PersonaStats, CreatePersonaBody } from "@/types/persona";

const API_BASE = "/api/personas";

export interface PersonaListResponse {
  personas: Persona[];
  stats: PersonaStats;
}

export async function fetchPersonas(
  workspaceId: string
): Promise<PersonaListResponse> {
  const res = await fetch(`${API_BASE}?workspaceId=${workspaceId}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch personas (${res.status})`);
  }
  return res.json();
}

export async function createPersona(
  workspaceId: string,
  createdById: string,
  body: CreatePersonaBody
): Promise<Persona> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, workspaceId, createdById }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to create persona (${res.status})`);
  }
  return res.json();
}
