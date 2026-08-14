// ============================================================
// Sectie → save-for-AI-gate voor StyleguideRule
//
// Elke regel hangt aan een sectie ('colors', 'logo', 'imagery',
// 'design-language', …). Die secties hebben op `BrandStyleguide` een
// save-for-AI-vlag; staat die uit, dan gaat de sectie niet mee in de
// AI-context. Regels uit zo'n sectie horen dan ook nergens anders te
// verschijnen — niet in het manifest, en niet als score-aftrek.
//
// Eén mapping, twee consumenten (manifest-builder + styleguide-rule-compiler),
// zodat "wat de AI krijgt" en "waarop we scoren" niet uit elkaar kunnen
// lopen. Dat uiteenlopen is de bugklasse uit gotchas.md:380 (canvas-context
// las photographyStyle langs de save-for-AI-gate om).
//
// Secties zónder gate (bv. toekomstige 'voice'/'copy'-regels) zijn niet
// gegate en gaan altijd mee — fail-open is hier correct: een regel
// onderdrukken die de gebruiker expliciet heeft geschreven is erger dan
// hem tonen.
// ============================================================

/** De save-for-AI-vlaggen die een regelsectie kan hebben. */
export interface RuleSectionGates {
  logoSavedForAi: boolean;
  colorsSavedForAi: boolean;
  typographySavedForAi: boolean;
  imagerySavedForAi: boolean;
  designLanguageSavedForAi: boolean;
  visualLanguageSavedForAi: boolean;
}

const SECTION_GATE: Record<string, keyof RuleSectionGates> = {
  logo: "logoSavedForAi",
  colors: "colorsSavedForAi",
  typography: "typographySavedForAi",
  imagery: "imagerySavedForAi",
  "design-language": "designLanguageSavedForAi",
  "visual-language": "visualLanguageSavedForAi",
};

/** Prisma-select voor de gates — houdt beide consumenten in sync. */
export const RULE_SECTION_GATE_SELECT = {
  logoSavedForAi: true,
  colorsSavedForAi: true,
  typographySavedForAi: true,
  imagerySavedForAi: true,
  designLanguageSavedForAi: true,
  visualLanguageSavedForAi: true,
} as const;

/**
 * Mag een regel uit deze sectie meegenomen worden?
 *
 * @param gates - de save-for-AI-vlaggen van de styleguide
 * @param section - de `section`-sleutel van de regel
 */
export function isRuleSectionSavedForAi(
  gates: Partial<RuleSectionGates>,
  section: string,
): boolean {
  const key = SECTION_GATE[section];
  if (!key) return true;
  return gates[key] === true;
}
