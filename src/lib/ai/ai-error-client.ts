// =============================================================
// AI Error Client — shared client-side interpreter for the
// "model offline / cannot generate" notice.
//
// Reads the backend error contract (AiErrorPayload: error,
// errorType, unavailable, retryable) when present, and falls
// back to the pure `parseAIError` heuristics when it isn't
// (old backend / raw Error / network failure).
//
// Flow:  catch(err) → interpretAiError(err) → inline notice
//        notifyAiError(err) → sonner toast
// =============================================================

import { toast } from 'sonner';
import type { TFunction } from 'i18next';

import {
  type AIError,
  type AIErrorType,
  getReadableErrorMessage,
  isModelUnavailable,
  parseAIError,
} from './error-handler';

export interface NormalizedAiError {
  /** The single gate: only when true do we show the "model offline" UI. */
  unavailable: boolean;
  errorType: AIErrorType;
  /** A readable fallback message (used for generic, non-unavailable errors). */
  message: string;
  retryable: boolean;
}

const AI_ERROR_TYPES: readonly AIErrorType[] = [
  'overloaded',
  'rate_limit',
  'authentication',
  'invalid_request',
  'network',
  'timeout',
  'unknown',
];

function isAIErrorType(value: unknown): value is AIErrorType {
  return typeof value === 'string' && (AI_ERROR_TYPES as readonly string[]).includes(value);
}

/** A user-cancelled fetch / aborted stream — never surface this as an error. */
export function isAbortError(input: unknown): boolean {
  if (!input || typeof input !== 'object') return false;
  const name = (input as { name?: unknown }).name;
  if (name === 'AbortError') return true;
  return (
    typeof DOMException !== 'undefined' &&
    input instanceof DOMException &&
    input.name === 'AbortError'
  );
}

/**
 * Read the explicit backend contract off a payload object or a
 * thrown Error that had the fields attached (Object.assign). Returns
 * null when neither `unavailable` nor a valid `errorType` is present,
 * so the caller can fall back to heuristic classification.
 */
function readContract(input: unknown): NormalizedAiError | null {
  if (!input || typeof input !== 'object') return null;
  const obj = input as Record<string, unknown>;
  const hasUnavailable = typeof obj.unavailable === 'boolean';
  const errorType = isAIErrorType(obj.errorType) ? obj.errorType : undefined;
  if (!hasUnavailable && !errorType) return null;

  const type: AIErrorType = errorType ?? 'unknown';
  const message =
    typeof obj.error === 'string'
      ? obj.error
      : typeof obj.message === 'string'
        ? obj.message
        : getReadableErrorMessage(type);
  const retryable =
    typeof obj.retryable === 'boolean'
      ? obj.retryable
      : type !== 'authentication' && type !== 'invalid_request' && type !== 'unknown';
  const probe: AIError = { type, message, retryable };
  const unavailable = hasUnavailable ? (obj.unavailable as boolean) : isModelUnavailable(probe);

  return { unavailable, errorType: type, message, retryable };
}

/**
 * Normalize any error shape (backend payload, parsed JSON, thrown
 * Error, SSE error object, or `Response`) into a NormalizedAiError.
 * Aborts are always normalized to non-unavailable so a cancelled
 * request can never look like "model offline".
 */
export function interpretAiError(input: unknown): NormalizedAiError {
  if (isAbortError(input)) {
    return { unavailable: false, errorType: 'timeout', message: '', retryable: true };
  }

  const contract = readContract(input);
  if (contract) return contract;

  const parsed = parseAIError(input);
  return {
    unavailable: isModelUnavailable(parsed),
    errorType: parsed.type,
    message: getReadableErrorMessage(parsed),
    retryable: parsed.retryable,
  };
}

/** Convenience predicate. */
export function isModelUnavailableError(input: unknown): boolean {
  return interpretAiError(input).unavailable;
}

/**
 * Turn a failed `Response` into an Error carrying the backend contract
 * fields (status + errorType/unavailable/retryable). Throw it so a catch
 * can classify the failure via interpretAiError.
 */
export async function errorFromResponse(res: Response, fallback = 'Request failed'): Promise<Error> {
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return Object.assign(
    new Error(typeof body.error === 'string' ? body.error : fallback),
    {
      status: res.status,
      errorType: body.errorType,
      unavailable: body.unavailable,
      retryable: body.retryable,
    },
  );
}

// ─── User-facing copy ──────────────────────────────────────
//
// De teksten leven in de `ai-errors`-namespace (nl + en), niet hier. Tot
// 2026-08-18 stonden ze hardcoded in het Engels in dit bestand terwijl de
// rest van de UI Nederlands is — de kop zei zelfs "(NL)".
//
// Vertalen gebeurt via een doorgegeven `TFunction`, hetzelfde patroon als
// `translateApiError` in src/lib/api/api-error.ts: lib-code kan geen hook
// gebruiken, dus de aanroeper (component of hook) geeft `t` mee. Bewust een
// verplicht eerste argument en niet een optionele veld in `opts`: zo wijst de
// compiler elke aanroepplek aan in plaats van stil op Engels terug te vallen.

export interface UnavailableMessage {
  title: string;
  body: string;
  toastDescription: string;
}

/** Per-type copy for an unavailable error (auth/rate-limit get their own wording). */
export function getUnavailableMessage(t: TFunction, error: NormalizedAiError): UnavailableMessage {
  const variant =
    error.errorType === 'authentication' || error.errorType === 'rate_limit'
      ? error.errorType
      : 'default';
  const key = `unavailable.${variant}`;
  return {
    title: t(`${key}.title`, { ns: 'ai-errors' }),
    body: t(`${key}.body`, { ns: 'ai-errors' }),
    toastDescription: t(`${key}.toastDescription`, { ns: 'ai-errors' }),
  };
}

// ─── notifyAiError ─────────────────────────────────────────

/**
 * Fire a toast for a failed AI call and return the normalized error.
 * - Unavailable → rich "model offline" toast (with optional retry action).
 * - Other failures → a generic error toast (so toast-only surfaces still
 *   inform the user). Pass `suppressToast` to render inline-only.
 * - Aborts → never toast.
 */
export function notifyAiError(
  t: TFunction,
  input: unknown,
  opts?: { retry?: () => void; suppressToast?: boolean },
): NormalizedAiError {
  const error = interpretAiError(input);
  if (opts?.suppressToast || isAbortError(input)) return error;

  const retryLabel = t('retry', { ns: 'ai-errors' });

  if (error.unavailable) {
    const msg = getUnavailableMessage(t, error);
    toast.error(msg.title, {
      description: msg.toastDescription,
      action:
        error.retryable && opts?.retry ? { label: retryLabel, onClick: opts.retry } : undefined,
    });
  } else {
    toast.error(error.message || t('genericError', { ns: 'ai-errors' }), {
      action: opts?.retry ? { label: retryLabel, onClick: opts.retry } : undefined,
    });
  }
  return error;
}
