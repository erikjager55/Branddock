// =============================================================
// Postiz-client (P3.5, ADR 2026-07-17) — dunne HTTP-wrapper op de Postiz
// public API voor de 'postiz'-publish-provider.
//
// Positionering: Branddock bouwt bewust géén eigen scheduler (anti-les uit
// de Postiz-analyse) — dit is de warme handover: on-brand gevalideerde
// content uit de bestaande publish-keten doorzetten naar de scheduler van
// de klant. Credentials per workspace op het PublishChannel
// ({ apiKey, integrationId, baseUrl? }).
//
// NB: het Postiz-request/response-contract is defensief geïmplementeerd
// (non-2xx → fout met body-tekst); einde-tot-einde-verificatie tegen een
// echt Postiz-account is user-held (credentials) — zie task-file.
// =============================================================

const DEFAULT_BASE_URL = 'https://api.postiz.com/public/v1';
const REQUEST_TIMEOUT_MS = 15_000;

export interface PostizIntegration {
  id: string;
  name?: string;
  identifier?: string;
}

interface PostizRequestOptions {
  apiKey: string;
  baseUrl?: string;
}

async function postizFetch(
  opts: PostizRequestOptions,
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const base = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      // Postiz public API verwacht de key rauw in Authorization (geen Bearer).
      authorization: opts.apiKey,
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Postiz ${res.status}: ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Lijst de gekoppelde kanalen van het Postiz-account (voor config-validatie). */
export async function listPostizIntegrations(opts: PostizRequestOptions): Promise<PostizIntegration[]> {
  const data = await postizFetch(opts, '/integrations', { method: 'GET' });
  if (!Array.isArray(data)) return [];
  return data.flatMap((item): PostizIntegration[] => {
    if (!item || typeof item !== 'object') return [];
    const o = item as Record<string, unknown>;
    if (typeof o.id !== 'string') return [];
    return [{
      id: o.id,
      name: typeof o.name === 'string' ? o.name : undefined,
      identifier: typeof o.identifier === 'string' ? o.identifier : undefined,
    }];
  });
}

export interface CreatePostizPostInput {
  integrationId: string;
  content: string;
  /** ISO-datum; weggelaten = direct publiceren. */
  scheduledAt?: string;
}

export interface PostizPostResult {
  externalId: string | null;
}

/** Zet één post klaar (direct of gepland) op het opgegeven Postiz-kanaal. */
export async function createPostizPost(
  opts: PostizRequestOptions,
  input: CreatePostizPostInput,
): Promise<PostizPostResult> {
  const body = {
    type: input.scheduledAt ? 'schedule' : 'now',
    date: input.scheduledAt ?? new Date().toISOString(),
    shortLink: false,
    tags: [],
    posts: [
      {
        integration: { id: input.integrationId },
        value: [{ content: input.content }],
      },
    ],
  };
  const data = await postizFetch(opts, '/posts', { method: 'POST', body: JSON.stringify(body) });
  // Response-shape defensief lezen: één post terug → id, anders null.
  if (Array.isArray(data) && data[0] && typeof data[0] === 'object') {
    const first = data[0] as Record<string, unknown>;
    if (typeof first.postId === 'string') return { externalId: first.postId };
    if (typeof first.id === 'string') return { externalId: first.id };
  }
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (typeof o.id === 'string') return { externalId: o.id };
  }
  return { externalId: null };
}
