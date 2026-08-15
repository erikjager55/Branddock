// ============================================================
// Tekst-matcher primitieven — gedeeld door de rule-evaluators
//
// Verhuisd uit rule-compiler.ts toen styleguide-rule-compiler.ts een tweede
// consument werd. Pure functies, geen DB, geen state: veilig te importeren
// vanuit smoke-tests zonder database.
//
// De regex-vormen zijn 1-op-1 overgenomen zodat bestaande BrandRule-scores
// byte-identiek blijven — dit was een verhuizing, geen herijking.
// ============================================================

/** Escape een literal zodat hij veilig in een regex-bron past. */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Word-boundary-regex voor een letterlijk woord of frase, case-insensitive.
 * Dit is de matcher achter FORBIDDEN_WORD: "innovatief" matcht niet in
 * "innovatieve" (daarvoor bestaat stem-expansie in brand-rule-sync.ts).
 *
 * LET OP — `\b` is in JavaScript ASCII-gebaseerd (`[A-Za-z0-9_]`). Een woord
 * met een diakriet ("dé", "café", "één") krijgt daardoor géén boundary na de
 * accentletter en matcht dus nooit. Dat is een bestaand defect in de
 * BrandRule-lane; deze functie is bewust ongewijzigd gelaten zodat de
 * verhuizing uit rule-compiler.ts gedragsneutraal blijft. Nieuwe code
 * gebruikt `unicodeWordBoundaryRegex`.
 */
export function wordBoundaryRegex(literal: string): RegExp {
  return new RegExp(`\\b${escapeRegex(literal)}\\b`, "gi");
}

/**
 * Word-boundary-regex die óók op diakrieten klopt: de boundary is "geen
 * letter, cijfer of underscore" volgens Unicode in plaats van ASCII. Nodig
 * voor Nederlandse merkvocabulaire ("dé", "één", "café") en voor elke
 * niet-Engelse markt.
 */
export function unicodeWordBoundaryRegex(literal: string): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}_])${escapeRegex(literal)}(?![\\p{L}\\p{N}_])`,
    "giu",
  );
}

export interface TextMatch {
  /** De letterlijk gematchte tekst. */
  text: string;
  /** 0-based char-offset in de bron. */
  index: number;
}

/**
 * Alle matches van een global regex, met offset. `matchAll` kloont de regex
 * intern, dus een gedeelde regex-instantie raakt hier niet vervuild.
 */
export function findMatches(text: string, regex: RegExp): TextMatch[] {
  const out: TextMatch[] = [];
  for (const m of text.matchAll(regex)) {
    if (m.index === undefined) continue;
    out.push({ text: m[0], index: m.index });
  }
  return out;
}

/** Splits op `. ! ?` gevolgd door whitespace + hoofdletter. */
export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+(?=[A-Z])/g);
}

/** Woorden tellen op whitespace — de noemer van elke ruleScore-normalisatie. */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Tekens die als "emoji" tellen, minus de typografische symbolen die
 * Unicode wél als Extended_Pictographic markeert maar die in merkcopy
 * volstrekt legitiem zijn: © (U+00A9), ® (U+00AE), ™ (U+2122).
 */
const EMOJI_ALLOWLIST = new Set(["©", "®", "™"]);

/** Vind emoji in een tekst. Grapheme-bewust: ZWJ-sequenties tellen als één hit. */
export function findEmoji(text: string): TextMatch[] {
  const regex = /\p{Extended_Pictographic}(‍\p{Extended_Pictographic}|️)*/gu;
  return findMatches(text, regex).filter((m) => !EMOJI_ALLOWLIST.has(m.text));
}

/** Vind uitroeptekens (ook de fullwidth-variant, die uit CJK-plakwerk komt). */
export function findExclamationMarks(text: string): TextMatch[] {
  return findMatches(text, /[!！]/g);
}
