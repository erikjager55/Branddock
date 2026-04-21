// =============================================================
// Emailit API v2 client (4.2)
//
// Low-level HTTP wrapper around api.emailit.com/v2. Bearer token
// auth, 30s timeout, typed errors. Returns null-safe status via
// isEmailitConfigured() so calling code can no-op in local dev.
//
// There is no official Node SDK yet; we use fetch directly.
// =============================================================

const BASE_URL = 'https://api.emailit.com/v2';
const DEFAULT_TIMEOUT_MS = 30_000;

export class EmailitError extends Error {
  public readonly status: number;
  public readonly body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'EmailitError';
    this.status = status;
    this.body = body;
  }
}

export function isEmailitConfigured(): boolean {
  return Boolean(process.env.EMAILIT_API_KEY);
}

function getApiKey(): string {
  const key = process.env.EMAILIT_API_KEY;
  if (!key) {
    throw new EmailitError(
      'EMAILIT_API_KEY is not set — cannot send email in this environment',
      503,
      null,
    );
  }
  return key;
}

async function request<T>(
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
  path: string,
  body?: unknown,
  opts?: { timeoutMs?: number },
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    const parsed = text ? safeJsonParse(text) : null;

    if (!response.ok) {
      throw new EmailitError(
        `Emailit ${method} ${path} failed: ${response.status}`,
        response.status,
        parsed ?? text,
      );
    }

    return parsed as T;
  } catch (err) {
    if (err instanceof EmailitError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new EmailitError('Emailit request timed out', 504, null);
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new EmailitError(`Emailit request error: ${message}`, 500, null);
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Low-level methods ─────────────────────────────────────

export const emailitClient = {
  // Emails
  sendEmail: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>('POST', '/emails', body),
  getEmail: (id: string) =>
    request<Record<string, unknown>>('GET', `/emails/${encodeURIComponent(id)}`),

  // Audiences + Subscribers
  addSubscriber: (audienceId: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(
      'POST',
      `/audiences/${encodeURIComponent(audienceId)}/subscribers`,
      body,
    ),
  removeSubscriber: (audienceId: string, subscriberId: string) =>
    request<void>(
      'DELETE',
      `/audiences/${encodeURIComponent(audienceId)}/subscribers/${encodeURIComponent(subscriberId)}`,
    ),

  // Suppressions
  createSuppression: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>('POST', '/suppressions', body),
  deleteSuppression: (id: string) =>
    request<void>('DELETE', `/suppressions/${encodeURIComponent(id)}`),
  listSuppressions: (params?: { email?: string }) => {
    const query = params?.email ? `?email=${encodeURIComponent(params.email)}` : '';
    return request<{ data?: unknown[] }>('GET', `/suppressions${query}`);
  },
};

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
