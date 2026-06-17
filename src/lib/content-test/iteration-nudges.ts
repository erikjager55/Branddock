// =============================================================
// Shared iteration-nudge builder — content-test improvement #7+#8.
// Wordt gebruikt zowel in canvas-orchestrator (SSE 'complete' event)
// als client-side bij reload van een complete deliverable (persistence).
// =============================================================

export interface IterationNudge {
  id: string;
  label: string;
  intent: 'revise_section' | 'adjust_tone' | 'derive' | 'add_image' | 'auto_iterate';
  /** Concrete DELIVERABLE_TYPES.id voor derive-acties. */
  targetContentTypeId?: string;
}

/**
 * Compute nudges op basis van content-type en visual-state. Pure functie
 * zonder I/O zodat we hem zowel server-side (orchestrator complete event)
 * als client-side (canvas-load persistence) kunnen gebruiken.
 */
export function buildIterationNudges(input: {
  contentType: string | null;
  hasImageComponent: boolean;
  /** True wanneer score < threshold; "Verbeter automatisch" chip wordt dan
   *  toegevoegd om opt-in iteratie aan te bieden. */
  scoreBelowThreshold?: boolean;
}): IterationNudge[] {
  const nudges: IterationNudge[] = [
    { id: 'revise-section', label: 'Revise a section', intent: 'revise_section' },
    { id: 'adjust-tone', label: 'Adjust tone', intent: 'adjust_tone' },
  ];
  // UX-overhaul 2026-05-13: auto-verbeteren chip wanneer score laag. Geeft
  // user een 2e entry-point naast de prominente FidelityScoreBar-CTA.
  if (input.scoreBelowThreshold) {
    nudges.push({
      id: 'auto-improve',
      label: 'Improve score automatically',
      intent: 'auto_iterate',
    });
  }
  const ct = input.contentType?.toLowerCase() ?? '';
  if (ct.includes('blog') || ct.includes('article') || ct.includes('long') || ct.includes('pillar')) {
    nudges.push({
      id: 'variant-linkedin',
      label: 'Create LinkedIn variant',
      intent: 'derive',
      targetContentTypeId: 'linkedin-post',
    });
    nudges.push({
      id: 'variant-email',
      label: 'Create newsletter variant',
      intent: 'derive',
      targetContentTypeId: 'newsletter',
    });
  } else if (ct.includes('social') || ct.includes('linkedin') || ct.includes('twitter')) {
    nudges.push({
      id: 'variant-blog',
      label: 'Create blog-post version',
      intent: 'derive',
      targetContentTypeId: 'blog-post',
    });
  } else if (ct.includes('email') || ct.includes('newsletter')) {
    nudges.push({
      id: 'variant-landing',
      label: 'Create landing page',
      intent: 'derive',
      targetContentTypeId: 'landing-page',
    });
  }
  if (!input.hasImageComponent && (ct.includes('blog') || ct.includes('pillar'))) {
    nudges.push({ id: 'add-hero-image', label: 'Add hero image', intent: 'add_image' });
  }
  return nudges;
}
