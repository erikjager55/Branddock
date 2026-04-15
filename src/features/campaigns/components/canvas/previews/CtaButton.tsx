'use client';

import React from 'react';
import type { PreviewContent } from '../../../types/canvas.types';

/**
 * Extract the best CTA text from previewContent.
 * Priority: explicit cta group → cta field on any group → extract from content text → fallback.
 */
export function extractCta(previewContent: PreviewContent, fallback?: string): string | null {
  // 1. Explicit "cta" group (some templates define it)
  if (previewContent.cta?.content) return previewContent.cta.content;

  // 2. CTA field on any content group
  for (const value of Object.values(previewContent)) {
    if (value?.cta) return value.cta;
  }

  // 3. Try to extract from content text — look for common CTA patterns
  for (const value of Object.values(previewContent)) {
    if (!value?.content) continue;
    const extracted = extractCtaFromText(value.content);
    if (extracted) return extracted;
  }

  return fallback ?? null;
}

/**
 * Try to detect a CTA from the content text.
 * Looks for: [CTA text](url), **CTA: text**, "👉 text", or common CTA phrases.
 */
function extractCtaFromText(text: string): string | null {
  // Pattern 1: Markdown link that looks like a CTA [Learn More](url)
  const linkMatch = text.match(/\[([^\]]{3,40})\]\([^)]+\)\s*$/m);
  if (linkMatch) return linkMatch[1];

  // Pattern 2: **CTA: Something** or **👉 Something**
  const ctaLabelMatch = text.match(/\*\*(?:CTA|👉|→)\s*:?\s*(.{3,40})\*\*/i);
  if (ctaLabelMatch) return ctaLabelMatch[1].trim();

  // Pattern 3: Last bold phrase that looks like an action (contains a verb)
  const boldPhrases = [...text.matchAll(/\*\*(.{3,40}?)\*\*/g)].map((m) => m[1]);
  const ctaVerbs = /^(get|start|join|sign|book|claim|download|discover|learn|try|shop|buy|register|subscribe|explore|request|schedule|apply|contact|read|watch|listen)/i;
  for (let i = boldPhrases.length - 1; i >= 0; i--) {
    if (ctaVerbs.test(boldPhrases[i].trim())) return boldPhrases[i].trim();
  }

  return null;
}

/**
 * Shared CTA button for platform previews.
 */
export function CtaButton({
  text,
  variant = 'filled',
  className = '',
}: {
  text: string;
  variant?: 'filled' | 'outline' | 'link' | 'pill';
  className?: string;
}) {
  const styles: Record<string, string> = {
    filled: 'inline-block px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-md',
    outline: 'inline-block px-5 py-2 text-sm font-medium text-teal-700 border border-teal-600 rounded-md',
    link: 'text-sm font-medium text-teal-600 underline',
    pill: 'inline-block px-5 py-2 text-xs font-semibold text-white bg-teal-600 rounded-full',
  };

  return (
    <span className={`${styles[variant]} ${className}`}>
      {text}
    </span>
  );
}
