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

// ─── User-facing copy (NL) ─────────────────────────────────

export const MODEL_UNAVAILABLE_COPY = {
  inlineTitle: 'The AI model is currently unavailable',
  inlineBody:
    'Generating is not possible right now. This is on the AI provider, not your input. Please try again shortly.',
  toastTitle: 'AI model unavailable',
  toastDescription: 'Generating is not possible right now — please try again shortly.',
  retryLabel: 'Try again',
} as const;

export interface UnavailableMessage {
  title: string;
  body: string;
  toastDescription: string;
}

/** Per-type copy for an unavailable error (auth/rate-limit get their own wording). */
export function getUnavailableMessage(error: NormalizedAiError): UnavailableMessage {
  switch (error.errorType) {
    case 'authentication':
      return {
        title: 'AI model not configured',
        body: 'There is a problem with the AI configuration. Please contact your administrator.',
        toastDescription: 'AI configuration problem — please contact your administrator.',
      };
    case 'rate_limit':
      return {
        title: 'Too many requests',
        body: 'Too many requests were sent. Please wait a moment and try again.',
        toastDescription: 'Please wait a moment and try again.',
      };
    default:
      return {
        title: MODEL_UNAVAILABLE_COPY.inlineTitle,
        body: MODEL_UNAVAILABLE_COPY.inlineBody,
        toastDescription: MODEL_UNAVAILABLE_COPY.toastDescription,
      };
  }
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
  input: unknown,
  opts?: { retry?: () => void; suppressToast?: boolean },
): NormalizedAiError {
  const error = interpretAiError(input);
  if (opts?.suppressToast || isAbortError(input)) return error;

  if (error.unavailable) {
    const msg = getUnavailableMessage(error);
    toast.error(msg.title, {
      description: msg.toastDescription,
      action:
        error.retryable && opts?.retry
          ? { label: MODEL_UNAVAILABLE_COPY.retryLabel, onClick: opts.retry }
          : undefined,
    });
  } else {
    toast.error(error.message || 'Er ging iets mis. Probeer het opnieuw.', {
      action: opts?.retry
        ? { label: MODEL_UNAVAILABLE_COPY.retryLabel, onClick: opts.retry }
        : undefined,
    });
  }
  return error;
}
