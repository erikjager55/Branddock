// =============================================================
// File content validator (9.6 H5 — magic-byte MIME check)
//
// The client-supplied `file.type` (from multipart Content-Type) is
// trivially spoofable. For binary uploads we verify magic bytes via
// the `file-type` library before trusting the payload.
//
// SVG is handled separately because it's XML text, not a binary
// format — `file-type` can't detect it reliably and SVGs carry
// their own XSS risk via inline <script> / on* handlers.
// =============================================================

import { fileTypeFromBuffer } from 'file-type';

export interface FileValidationResult {
  ok: boolean;
  detectedMime?: string;
  detectedExt?: string;
  error?: string;
}

/**
 * Validate that an uploaded file's magic bytes match an allowed MIME set.
 * Intended for binary types (images, PDFs, office docs) that always have
 * a signature. Text-only types (txt, md, csv, json) lack magic bytes and
 * should be validated separately on extension + claimed MIME.
 *
 * Fails closed: if detection returns nothing, the file is rejected.
 */
export async function validateBinaryFile(
  buffer: Buffer,
  allowedMimes: ReadonlySet<string>,
): Promise<FileValidationResult> {
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    return {
      ok: false,
      error: 'Could not detect file type from file contents',
    };
  }

  if (!allowedMimes.has(detected.mime)) {
    return {
      ok: false,
      detectedMime: detected.mime,
      detectedExt: detected.ext,
      error: `File content is "${detected.mime}" (detected), not in allowed MIME list`,
    };
  }

  return {
    ok: true,
    detectedMime: detected.mime,
    detectedExt: detected.ext,
  };
}

/**
 * Conservative SVG validator for user-uploaded logos/brand assets.
 *
 * Enforces that the file:
 *   1. Is valid UTF-8 text
 *   2. Has an `<svg` root element (simple sniff, case-insensitive)
 *   3. Contains no `<script>` blocks
 *   4. Contains no `on*` event-handler attributes
 *   5. Contains no `javascript:` URIs inside href/xlink:href
 *
 * This is not a full XML sanitizer — DOMPurify would cover more
 * edge cases (foreignObject, CDATA-wrapped scripts, etc.). For
 * anything beyond static brand logos, pair this with DOMPurify or
 * serve SVGs with `Content-Disposition: attachment`.
 */
export function validateSvgContent(buffer: Buffer): FileValidationResult {
  let text: string;
  try {
    text = buffer.toString('utf8');
  } catch {
    return { ok: false, error: 'SVG is not valid UTF-8 text' };
  }

  // Must contain an <svg root (allow whitespace, XML prolog, DOCTYPE)
  if (!/<svg[\s>]/i.test(text)) {
    return { ok: false, error: 'Not a recognisable SVG document' };
  }

  if (/<script\b/i.test(text)) {
    return { ok: false, error: 'SVG contains <script> — rejected for security' };
  }

  // Any on* event handler attribute (onload, onclick, onmouseover, …)
  if (/\son[a-z]+\s*=/i.test(text)) {
    return { ok: false, error: 'SVG contains event handler attribute — rejected' };
  }

  // javascript: URI in href / xlink:href
  if (/(xlink:)?href\s*=\s*["']?\s*javascript:/i.test(text)) {
    return { ok: false, error: 'SVG contains javascript: URI — rejected' };
  }

  return { ok: true, detectedMime: 'image/svg+xml', detectedExt: 'svg' };
}
