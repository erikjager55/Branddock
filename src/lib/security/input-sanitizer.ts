// =============================================================
// User-input sanitizer (9.6 H7 — prompt injection mitigation)
//
// Strips LLM control tokens that appear in no legitimate English/
// Dutch content but are used by attackers to forge role boundaries
// (e.g. inject a fake "<|system|>" header to redirect the model).
// Applied at entry points where user-controlled strings flow into
// prompts — NOT at AI caller layer, to avoid corrupting our own
// prompt templates.
// =============================================================

/** ChatML / Llama-instruct / SentencePiece / Anthropic-legacy role markers. */
const CONTROL_TOKEN_REGEX =
  /<\|(?:system|user|assistant|im_start|im_end|endoftext|fim_[a-z_]+|tool_call_(?:begin|end))\|>|<\/?s>|\[\/?INST\]/gi;

/** Anthropic legacy conversation markers ("\n\nHuman:", "\n\nAssistant:"). */
const ROLE_PREFIX_REGEX = /\n\n(?:Human|H|Assistant|A):\s*/gi;

export const DEFAULT_AI_INPUT_MAX_LENGTH = 50_000;

export interface SanitizeResult {
  sanitized: string;
  wasTruncated: boolean;
  wasStripped: boolean;
}

/**
 * Strip LLM control tokens from user-supplied text and enforce a length cap.
 * Safe to apply to any free-text field that will be concatenated into an
 * AI prompt. Caller decides the max length (default 50 000 chars ≈ 12-15k
 * tokens; override for shorter fields like chat messages).
 */
export function sanitizeAiInput(
  text: string,
  maxLength: number = DEFAULT_AI_INPUT_MAX_LENGTH,
): SanitizeResult {
  if (!text) {
    return { sanitized: '', wasTruncated: false, wasStripped: false };
  }

  const stripped = text.replace(CONTROL_TOKEN_REGEX, '').replace(ROLE_PREFIX_REGEX, '\n\n');
  const wasStripped = stripped.length !== text.length;

  const truncated = stripped.length > maxLength ? stripped.slice(0, maxLength) : stripped;
  const wasTruncated = truncated.length !== stripped.length;

  return { sanitized: truncated, wasTruncated, wasStripped };
}

/** Shorthand when you only need the cleaned string (no telemetry). */
export function sanitizeAiInputString(text: string, maxLength?: number): string {
  return sanitizeAiInput(text, maxLength).sanitized;
}
