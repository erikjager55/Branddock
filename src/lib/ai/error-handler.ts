// =============================================================
// AI Error Handler — Shared utility for ALL AI/LLM calls
//
// Pure functions — no server-only imports. Works both client
// and server side.
//
// Flow:  catch(err) → parseAIError(err) → getReadableErrorMessage()
//        → AIErrorCard (UI) or JSON response (API)
// =============================================================

// ─── Types ─────────────────────────────────────────────────

export type AIErrorType =
  | 'overloaded'
  | 'rate_limit'
  | 'authentication'
  | 'invalid_request'
  | 'network'
  | 'timeout'
  | 'unknown';

export interface AIError {
  type: AIErrorType;
  message: string;
  status?: number;
  retryable: boolean;
  raw?: unknown;
}

// ─── Dutch user-facing messages ────────────────────────────

const ERROR_MESSAGES: Record<AIErrorType, string> = {
  overloaded:
    'Het AI-model is momenteel overbelast. Probeer het over een paar minuten opnieuw.',
  rate_limit:
    'Je hebt te veel verzoeken verstuurd. Wacht even voordat je opnieuw probeert.',
  authentication:
    'Er is een probleem met de API configuratie. Neem contact op met de beheerder.',
  invalid_request:
    'Er ging iets mis bij het verwerken van je verzoek. Probeer het opnieuw.',
  network:
    'Kan geen verbinding maken met de AI service. Controleer je internetverbinding.',
  timeout:
    'Het verzoek duurde te lang. Probeer het opnieuw met een korter bericht.',
  unknown:
    'Er ging iets mis. Probeer het opnieuw.',
};

// ─── HTTP status mapping ───────────────────────────────────

const STATUS_MAP: Record<AIErrorType, number> = {
  overloaded: 503,
  rate_limit: 429,
  authentication: 503,
  invalid_request: 400,
  network: 502,
  timeout: 504,
  unknown: 500,
};

// ─── parseAIError ──────────────────────────────────────────

/**
 * Normalize any error (OpenAI SDK, Anthropic SDK, HTTP response,
 * network error, etc.) into a uniform AIError.
 */
export function parseAIError(error: unknown): AIError {
  // Already an AIError
  if (
    error &&
    typeof error === 'object' &&
    'type' in error &&
    'retryable' in error &&
    typeof (error as AIError).type === 'string'
  ) {
    return error as AIError;
  }

  // Error instance (SDK errors, network errors, etc.)
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    const name = error.name;

    // Timeout / abort
    if (name === 'AbortError' || msg.includes('timed out') || msg.includes('timeout')) {
      return { type: 'timeout', message: error.message, retryable: true, raw: error };
    }

    // Network errors
    if (
      (name === 'TypeError' && (msg.includes('fetch') || msg.includes('network'))) ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('fetch failed') ||
      msg.includes('network')
    ) {
      return { type: 'network', message: error.message, retryable: true, raw: error };
    }

    // SDK errors with status code (OpenAI.APIError, Anthropic errors)
    if ('status' in error) {
      const status = (error as Error & { status: number }).status;
      if (status === 429) {
        return { type: 'rate_limit', message: error.message, status, retryable: true, raw: error };
      }
      if (status === 401 || status === 403) {
        return { type: 'authentication', message: error.message, status, retryable: false, raw: error };
      }
      if (status === 400) {
        return { type: 'invalid_request', message: error.message, status, retryable: false, raw: error };
      }
      if (status === 529 || status === 503) {
        return { type: 'overloaded', message: error.message, status, retryable: true, raw: error };
      }
    }

    // Pattern matching on message content
    if (msg.includes('overloaded') || msg.includes('capacity') || msg.includes('529')) {
      return { type: 'overloaded', message: error.message, retryable: true, raw: error };
    }
    if (msg.includes('rate limit') || msg.includes('rate_limit') || msg.includes('too many requests')) {
      return { type: 'rate_limit', message: error.message, retryable: true, raw: error };
    }
    if (msg.includes('api key') || msg.includes('api_key') || msg.includes('authentication') || msg.includes('unauthorized')) {
      return { type: 'authentication', message: error.message, retryable: false, raw: error };
    }
    if (msg.includes('invalid') && (msg.includes('request') || msg.includes('param'))) {
      return { type: 'invalid_request', message: error.message, retryable: false, raw: error };
    }

    return { type: 'unknown', message: error.message, retryable: false, raw: error };
  }

  // Plain object (e.g. parsed JSON from HTTP error response)
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    const type = obj.type as string | undefined;
    const errorMsg = (obj.error as string) || (obj.message as string) || 'Unknown error';

    if (type === 'overloaded_error' || type === 'overloaded') {
      return { type: 'overloaded', message: errorMsg, retryable: true, raw: error };
    }
    if (type === 'rate_limit_error' || type === 'rate_limit') {
      return { type: 'rate_limit', message: errorMsg, retryable: true, raw: error };
    }
    if (type === 'authentication_error' || type === 'authentication') {
      return { type: 'authentication', message: errorMsg, retryable: false, raw: error };
    }
    if (type === 'invalid_request_error' || type === 'invalid_request') {
      return { type: 'invalid_request', message: errorMsg, retryable: false, raw: error };
    }

    // Has a retryable flag already
    if ('retryable' in obj && typeof obj.retryable === 'boolean') {
      return {
        type: (type as AIErrorType) || 'unknown',
        message: errorMsg,
        retryable: obj.retryable,
        raw: error,
      };
    }

    return { type: 'unknown', message: errorMsg, retryable: false, raw: error };
  }

  return { type: 'unknown', message: String(error), retryable: false, raw: error };
}

// ─── getReadableErrorMessage ───────────────────────────────

/**
 * Returns a Dutch user-friendly error message.
 * Accepts either a parsed AIError or a raw error (will parse internally).
 */
export function getReadableErrorMessage(error: unknown): string {
  const parsed = parseAIError(error);
  return ERROR_MESSAGES[parsed.type];
}

// ─── shouldAutoRetry ───────────────────────────────────────

/**
 * Determines whether the error is transient and a retry is likely
 * to succeed (overloaded, network, timeout).
 */
export function shouldAutoRetry(error: AIError | unknown): boolean {
  const parsed =
    error && typeof error === 'object' && 'retryable' in error
      ? (error as AIError)
      : parseAIError(error);
  return parsed.retryable;
}

// ─── withAIRetry ───────────────────────────────────────────

/**
 * Wraps an async function with automatic retry for transient AI errors.
 * Only retries if the error is classified as retryable.
 */
export async function withAIRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 1,
  delayMs = 3000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const parsed = parseAIError(err);

      if (!parsed.retryable || attempt >= maxRetries) {
        throw err;
      }

      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw lastError;
}

// ─── HTTP status for AIError type ──────────────────────────

/**
 * Returns the appropriate HTTP status code for an AI error type.
 * Useful in API routes: `return NextResponse.json({ error: msg }, { status: getAIErrorStatus(parsed) })`
 */
export function getAIErrorStatus(error: AIError): number {
  return STATUS_MAP[error.type];
}
