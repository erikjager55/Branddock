// =============================================================
// Locale Instruction Helper
//
// Centraliseert de "output must be in language X" instructie die
// in elke generation-prompt moet landen. Workspace.contentLanguage
// (ISO 639-1) is leidend; brand-foundation-velden in andere talen
// moeten worden vertaald, niet gemirrored.
// =============================================================

const LANGUAGE_NAMES: Record<string, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  nl: { name: 'Dutch', nativeName: 'Nederlands' },
  de: { name: 'German', nativeName: 'Deutsch' },
  fr: { name: 'French', nativeName: 'Français' },
  es: { name: 'Spanish', nativeName: 'Español' },
  pt: { name: 'Portuguese', nativeName: 'Português' },
  it: { name: 'Italian', nativeName: 'Italiano' },
};

/**
 * Build a strong language-enforcement instruction for system or context prompts.
 *
 * Returns an empty string when language is unknown — caller can safely concatenate.
 *
 * Wording chosen to:
 *  - Override mixed-language brand-foundation input (translate, don't mirror)
 *  - Block code-switching mid-output
 *  - Survive AI tendency to default to English on technical/marketing terms
 */
export function buildLocaleInstruction(language: string | undefined | null): string {
  if (!language) return '';
  const lang = language.toLowerCase().split('-')[0]; // tolerate BCP 47 by stripping region
  const meta = LANGUAGE_NAMES[lang];
  if (!meta) return '';

  return [
    `## OUTPUT LANGUAGE — CRITICAL`,
    `All generated content MUST be in **${meta.name} (${meta.nativeName})** only.`,
    `- Do NOT mix languages. Single-language output is required end-to-end.`,
    `- If source material in this prompt (brand context, persona descriptions, prior content, user instructions) is in another language, translate the meaning into ${meta.name} before responding.`,
    `- Do not preserve foreign-language phrases for "authenticity" — translate them.`,
    `- This rule outranks any tone or style guidance below.`,
    ``,
  ].join('\n');
}

/**
 * Same instruction shaped as a system-prompt fragment (no markdown header).
 * Use when the consumer is the SYSTEM role and surrounding text is plain prose.
 */
export function buildLocaleSystemFragment(language: string | undefined | null): string {
  if (!language) return '';
  const lang = language.toLowerCase().split('-')[0];
  const meta = LANGUAGE_NAMES[lang];
  if (!meta) return '';

  return `Output language requirement: respond exclusively in ${meta.name} (${meta.nativeName}). Do not mix languages. If source material is in another language, translate it. This rule outranks tone guidance.`;
}
