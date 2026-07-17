// =============================================================
// Locale Instruction Helper
//
// Centraliseert de "output must be in language X" instructie die
// in elke generation-prompt moet landen. Workspace.contentLanguage
// (ISO 639-1) is leidend; brand-foundation-velden in andere talen
// moeten worden vertaald, niet gemirrored.
// =============================================================

/**
 * Fast-path overrides for the most common workspace languages.
 * Output for these must stay byte-identical to the pre-Intl
 * implementation (call-sites and golden-sets depend on the wording).
 */
const LANGUAGE_NAMES: Record<string, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  nl: { name: 'Dutch', nativeName: 'Nederlands' },
  de: { name: 'German', nativeName: 'Deutsch' },
  fr: { name: 'French', nativeName: 'Français' },
  es: { name: 'Spanish', nativeName: 'Español' },
  pt: { name: 'Portuguese', nativeName: 'Português' },
  it: { name: 'Italian', nativeName: 'Italiano' },
};

let englishDisplayNames: Intl.DisplayNames | null | undefined;

function getEnglishDisplayNames(): Intl.DisplayNames | null {
  if (englishDisplayNames === undefined) {
    try {
      englishDisplayNames = new Intl.DisplayNames(['en'], { type: 'language', fallback: 'none' });
    } catch {
      englishDisplayNames = null; // runtime without Intl.DisplayNames → ISO-code fallback path
    }
  }
  return englishDisplayNames;
}

function lookupNativeName(base: string): string | undefined {
  try {
    return new Intl.DisplayNames([base], { type: 'language', fallback: 'none' }).of(base) ?? undefined;
  } catch {
    return undefined;
  }
}

export interface LocaleLabel {
  /** Full label for emphasis, e.g. "Dutch (Nederlands)" or "the language with ISO code 'zz'". */
  label: string;
  /** Short name for mid-sentence use, e.g. "Dutch". */
  shortName: string;
  /** English language name, e.g. "Dutch". ISO-code fallback phrase for unknown codes. */
  name: string;
  /** Native (endonym) name, e.g. "Nederlands". Equals `name` when identical or unknown. */
  nativeName: string;
}

/**
 * Resolve a language tag to prompt-ready names. Returns null only for
 * empty/missing input — every non-empty code yields an enforceable label,
 * so no workspace language is ever silently left without a guard.
 *
 * Shared resolver for every prompt that needs a human-readable language
 * name (locale instructions, brand-voice directive, rewriter/judge prompts)
 * so language coverage stays consistent across call-sites.
 */
export function resolveLocaleLabel(language: string | undefined | null): LocaleLabel | null {
  const normalized = language?.trim().toLowerCase() ?? '';
  if (!normalized) return null;
  const base = normalized.split('-')[0]; // tolerate BCP 47 by resolving the name from the base subtag

  const override = LANGUAGE_NAMES[base];
  if (override) {
    return {
      label: `${override.name} (${override.nativeName})`,
      shortName: override.name,
      name: override.name,
      nativeName: override.nativeName,
    };
  }

  let englishName: string | undefined;
  try {
    englishName = getEnglishDisplayNames()?.of(base) ?? undefined;
  } catch {
    englishName = undefined; // structurally invalid tag → ISO-code fallback below
  }
  if (englishName) {
    const nativeName = lookupNativeName(base) ?? englishName;
    return {
      label: `${englishName} (${nativeName})`,
      shortName: englishName,
      name: englishName,
      nativeName,
    };
  }

  const isoLabel = `the language with ISO code '${normalized}'`;
  return { label: isoLabel, shortName: isoLabel, name: isoLabel, nativeName: isoLabel };
}

/**
 * Build a strong language-enforcement instruction for system or context prompts.
 *
 * Returns an empty string only when the language is empty/missing — caller can
 * safely concatenate. Any non-empty code yields an instruction: known languages
 * via a fast-path map, other languages via Intl.DisplayNames, and codes unknown
 * to Intl via an explicit ISO-code fallback.
 *
 * Wording chosen to:
 *  - Override mixed-language brand-foundation input (translate, don't mirror)
 *  - Block code-switching mid-output
 *  - Survive AI tendency to default to English on technical/marketing terms
 *
 * EM-DASH-VRIJ, bewust (2026-07-17). Instructietekst primet output: het LP-pad mat
 * 92% em-dash-lijm in deliverables tegen 25% op het orchestrator-pad, en dáárom
 * verbiedt de Human Voice Directive em-dashes. Een taalregel die zélf em-dashes
 * bevat ondermijnt dat verbod — en bij `humanVoiceMode: 'OFF'` staat er niets meer
 * tegenover. De LP-golden-set (`scripts/eval/lp-variant-golden`) bewaakt dit met
 * `!prompt.system.includes('—')` op de OFF-prompt. Houd deze functie em-dash-vrij;
 * gebruik haakjes of een puntkomma.
 */
export function buildLocaleInstruction(language: string | undefined | null): string {
  const locale = resolveLocaleLabel(language);
  if (!locale) return '';

  return [
    `## OUTPUT LANGUAGE (CRITICAL)`,
    `All generated content MUST be in **${locale.label}** only.`,
    `- Do NOT mix languages. Single-language output is required end-to-end.`,
    `- If source material in this prompt (brand context, persona descriptions, prior content, user instructions) is in another language, translate the meaning into ${locale.shortName} before responding.`,
    `- Do not preserve foreign-language phrases for "authenticity"; translate them.`,
    `- This rule outranks any tone or style guidance below.`,
    ``,
  ].join('\n');
}

/**
 * Same instruction shaped as a system-prompt fragment (no markdown header).
 * Use when the consumer is the SYSTEM role and surrounding text is plain prose.
 */
export function buildLocaleSystemFragment(language: string | undefined | null): string {
  const locale = resolveLocaleLabel(language);
  if (!locale) return '';

  return `Output language requirement: respond exclusively in ${locale.label}. Do not mix languages. If source material is in another language, translate it. This rule outranks tone guidance.`;
}
