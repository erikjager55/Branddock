import type { Persona, PersonaStats, CreatePersonaBody } from "@/types/persona";

const API_BASE = "/api/personas";

export interface PersonaListResponse {
  personas: Persona[];
  stats: PersonaStats;
}

/**
 * Fetch personas list. workspaceId is resolved server-side from session cookie.
 */
export async function fetchPersonas(): Promise<PersonaListResponse> {
  const res = await fetch(API_BASE);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch personas (${res.status})`);
  }
  return res.json();
}

/**
 * Create a new persona. workspaceId is resolved server-side from session cookie.
 */
export async function createPersona(
  body: CreatePersonaBody & { createdById?: string }
): Promise<Persona> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to create persona (${res.status})`);
  }
  return res.json();
}
