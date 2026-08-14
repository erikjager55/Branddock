// ============================================================
// Deterministische constraint-afleiding uit een vrije-tekstregel
//
// De ~350 bestaande StyleguideRule-records zijn geïmporteerde `*Donts`-zinnen
// zonder `constraint`. Zonder classificatie is elke regel "onbekend": hij kan
// niet afgedwongen worden én hij reist mee naar kanalen waar hij niet
// nageleefd kan worden (een gradient-regel in een copy-view).
//
// Deze module classificeert wat zónder AI met zekerheid vast te stellen is:
//   1. een handvol decisieve tekst-signalen (emoji, uitroepteken)
//   2. de sectie als modaliteits-prior — 'colors'/'logo'/'imagery'/
//      'design-language'/'typography'/'visual-language' zijn per definitie
//      visueel; dat oordeel heeft de analyzer al gemaakt bij het toekennen
//      van de sectie.
//
// Alles wat niet in die twee valt blijft `null` — dat is het werk van de
// AI-structurer (rule-structurer.ts), niet van een gok hier.
//
// Bewust conservatief: een fout-positieve tekst-constraint veroorzaakt een
// onterechte score-aftrek. Een gemiste classificatie kost niets behalve een
// kans (ADR 2026-08-14-styleguide-rules-in-fval, D2).
// ============================================================

import type { RuleConstraint } from "./rule-constraints";

/** Secties waarvan de inhoud per definitie visueel is. */
const VISUAL_SECTIONS = new Set([
  "colors",
  "logo",
  "imagery",
  "design-language",
  "typography",
  "visual-language",
]);

/**
 * Trefwoord → visuele property. Alleen gebruikt om de property-naam scherper
 * te maken dan de sectienaam; de modaliteit staat al vast via de sectie.
 */
const VISUAL_PROPERTIES: Array<{ property: string; terms: RegExp }> = [
  { property: "gradient", terms: /\b(gradient|gradients|verloop|verlopen)\b/i },
  { property: "shadow", terms: /\b(shadow|shadows|schaduw|schaduwen|drop-shadow)\b/i },
  { property: "radius", terms: /\b(radius|corners|rounded|hoeken|afgerond|afgeronde)\b/i },
  { property: "stroke-width", terms: /\b(stroke|strokes|lijndikte|stroke weights?)\b/i },
  { property: "opacity", terms: /\b(opacity|transparantie|dekking)\b/i },
  { property: "color", terms: /(#[0-9a-f]{3,8}\b|\b(color|colors|colour|kleur|kleuren|palette|palet)\b)/i },
  { property: "typography", terms: /\b(font|fonts|typeface|typografie|letterspacing|letter spacing|wordmark)\b/i },
  { property: "logo", terms: /\b(logo|beeldmerk|woordmerk)\b/i },
  { property: "photography", terms: /\b(photo|photos|photography|fotografie|stock|imagery|beeldmateriaal)\b/i },
  { property: "icon", terms: /\b(icon|icons|icoon|iconen|iconography|iconografie)\b/i },
  { property: "spacing", terms: /\b(spacing|whitespace|witruimte|padding|margin)\b/i },
];

/** Decisieve tekst-signalen — alleen waar de regel letterlijk over de tekstvorm gaat. */
const EMOJI_MENTION = /\b(emoji|emojis|emoticon|emoticons)\b/i;
const EXCLAMATION_MENTION = /(\buitroepteken\w*\b|\bexclamation\s?(mark|point)s?\b)/i;
/** "Geen X" / "Don't use X" / "Avoid X" — de negatie die een verbod aankondigt. */
const PROHIBITION =
  /\b(geen|nooit|vermijd|niet)\b|\b(don'?t|do not|never|avoid|no)\b/i;

export interface DerivableRule {
  section: string;
  title: string;
  description?: string | null;
}

/**
 * Leid een constraint af uit een vrije-tekstregel, of `null` wanneer dat niet
 * met zekerheid kan.
 *
 * @param rule - sectie + titel (+ optionele beschrijving) van de regel
 * @returns een `derivedBy: 'deterministic'`-constraint, of null
 */
export function deriveRuleConstraint(rule: DerivableRule): RuleConstraint | null {
  const text = `${rule.title} ${rule.description ?? ""}`.trim();
  if (!text) return null;

  // 1. Decisieve tekst-signalen. Alleen bij een expliciet verbod: "Gebruik
  //    emoji spaarzaam" is geen harde regel die je kunt afdwingen.
  if (PROHIBITION.test(text)) {
    if (EMOJI_MENTION.test(text)) {
      return { modality: "text", check: "no-emoji", derivedBy: "deterministic" };
    }
    if (EXCLAMATION_MENTION.test(text)) {
      return { modality: "text", check: "no-exclamation-marks", derivedBy: "deterministic" };
    }
  }

  // 2. Sectie als modaliteits-prior.
  if (VISUAL_SECTIONS.has(rule.section)) {
    const match = VISUAL_PROPERTIES.find((p) => p.terms.test(text));
    return {
      modality: "visual",
      property: match?.property ?? rule.section,
      derivedBy: "deterministic",
    };
  }

  return null;
}
