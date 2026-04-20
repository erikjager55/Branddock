// =============================================================
// File content validator (9.6 H5 — magic-byte MIME check)
//
// The client-supplied `file.type` (from multipart Content-Type) is
// trivially spoofable. For binary uploads we verify magic bytes via
// the `file-type` library before trusting the payload.
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
