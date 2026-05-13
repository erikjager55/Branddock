// =============================================================
// Shared iteration-nudge builder — content-test improvement #7+#8.
// Wordt gebruikt zowel in canvas-orchestrator (SSE 'complete' event)
// als client-side bij reload van een complete deliverable (persistence).
// =============================================================

export interface IterationNudge {
  id: string;
  label: string;
  intent: 'revise_section' | 'adjust_tone' | 'derive' | 'add_image';
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
}): IterationNudge[] {
  const nudges: IterationNudge[] = [
    { id: 'revise-section', label: 'Een sectie herzien', intent: 'revise_section' },
    { id: 'adjust-tone', label: 'Toon aanpassen', intent: 'adjust_tone' },
  ];
  const ct = input.contentType?.toLowerCase() ?? '';
  if (ct.includes('blog') || ct.includes('article') || ct.includes('long') || ct.includes('pillar')) {
    nudges.push({
      id: 'variant-linkedin',
      label: 'LinkedIn-variant maken',
      intent: 'derive',
      targetContentTypeId: 'linkedin-post',
    });
    nudges.push({
      id: 'variant-email',
      label: 'Nieuwsbrief-variant maken',
      intent: 'derive',
      targetContentTypeId: 'newsletter',
    });
  } else if (ct.includes('social') || ct.includes('linkedin') || ct.includes('twitter')) {
    nudges.push({
      id: 'variant-blog',
      label: 'Blogpost-versie maken',
      intent: 'derive',
      targetContentTypeId: 'blog-post',
    });
  } else if (ct.includes('email') || ct.includes('newsletter')) {
    nudges.push({
      id: 'variant-landing',
      label: 'Landingspagina maken',
      intent: 'derive',
      targetContentTypeId: 'landing-page',
    });
  }
  if (!input.hasImageComponent && (ct.includes('blog') || ct.includes('pillar'))) {
    nudges.push({ id: 'add-hero-image', label: 'Hero-image toevoegen', intent: 'add_image' });
  }
  return nudges;
}
