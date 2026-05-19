// =============================================================
// LinkedIn Ad formats — single source of truth
//
// Q2 (2026-05-19): voorheen lazen content-type-inputs.ts (Step 1) en
// medium-config-registry.ts (Step 3) verschillende options-lijsten in
// verschillende value-schemes (Title Case vs kebab-case) — Step 1
// schreef "Single Image" terwijl Step 3 'single-image' verwachtte,
// en canvas-orchestrator injecteerde de raw string. Inconsistencies
// blokkeerden format-specific gedrag (prompt-branching, checklist).
//
// Pre-launch scope: 2 formats supported in linkedin-ad. Video-ad is sinds
// 2026-05-19 een **eigen content-type** (`linkedin-video-ad`) met eigen
// prompt + video-generation pipeline; te selecteren in Add Content modal.
// Carousel-ad uitgesteld (afhankelijk van algemene carousel-pipeline);
// Text Ad uitgesloten (LinkedIn heeft format gedeprecateerd).
// =============================================================

export type LinkedInAdFormat = 'single-image' | 'message-ad';

export interface LinkedInAdFormatDef {
  value: LinkedInAdFormat;
  label: string;
  description: string;
  /** Welke output-componenten verwacht worden in de gegenereerde content. */
  expectedComponents: ReadonlyArray<'image' | 'subject' | 'sender' | 'body' | 'cta'>;
}

export const LINKEDIN_AD_FORMATS: ReadonlyArray<LinkedInAdFormatDef> = [
  {
    value: 'single-image',
    label: 'Single Image',
    description: 'Sponsored content met 1 hero-image, intro-text, headline en CTA.',
    expectedComponents: ['image', 'body', 'cta'],
  },
  {
    value: 'message-ad',
    label: 'Message Ad',
    description: 'InMail-stijl 1-op-1 bericht met subject, body, sender en CTA-button.',
    expectedComponents: ['subject', 'sender', 'body', 'cta'],
  },
] as const;

const VALUES: ReadonlySet<string> = new Set(LINKEDIN_AD_FORMATS.map((f) => f.value));

/** Validate dat een gegeven string een ondersteunde format is. */
export function isLinkedInAdFormat(value: unknown): value is LinkedInAdFormat {
  return typeof value === 'string' && VALUES.has(value);
}

/** Lookup display-label voor een format-value. Fallback: kale value. */
export function getLinkedInAdFormatLabel(value: string): string {
  return LINKEDIN_AD_FORMATS.find((f) => f.value === value)?.label ?? value;
}

/** Lookup volledige definitie. Undefined bij onbekende value. */
export function getLinkedInAdFormatDef(value: string): LinkedInAdFormatDef | undefined {
  return LINKEDIN_AD_FORMATS.find((f) => f.value === value);
}
