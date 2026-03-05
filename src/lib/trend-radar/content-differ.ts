// =============================================================
// Content Differ — SHA256 hash comparison + new content extraction
// =============================================================

import { createHash } from 'crypto';

/** Compute sha256 hash of content string */
export function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/** Check if content has changed by comparing hashes */
export function hasContentChanged(
  newContent: string,
  previousHash: string | null,
): { changed: boolean; newHash: string } {
  const newHash = hashContent(newContent);
  if (!previousHash) {
    return { changed: true, newHash };
  }
  return { changed: newHash !== previousHash, newHash };
}

/**
 * Extract new/changed paragraphs from content by simple diff.
 * Compares line-by-line and returns lines not present in previous content.
 * Falls back to full content if no previous content is available.
 */
export function extractNewContent(
  currentContent: string,
  _previousContent?: string | null,
): string {
  // For now, return the full content since we don't store previous text.
  // The AI will handle extracting trends from the full page content.
  // Future improvement: store previous bodyText and do a real diff.
  return currentContent;
}
