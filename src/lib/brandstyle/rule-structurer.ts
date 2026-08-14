// ============================================================
// Rule-structurer — schrijfrichtlijnen → afdwingbare tekst-regels
//
// `BrandVoiceguide.writingGuidelines` en `contentGuidelines` bevatten de
// merkregels die over de tékst gaan ("gemiddeld 15-20 woorden per zin",
// "derde persoon, niet 'Wij organiseren'", "geen emoji"). Die richtlijnen
// gingen tot nu toe alleen als proza de AI-context in: ze stuurden de
// generatie wél, maar bereikten F-VAL's rules-pijler niet. Dit is de
// vindplaats van de tekst-regels die de designbibliotheek W2 mist — de
// styleguide-secties zelf zijn allemaal visueel.
//
// Deze module laat een model de richtlijnen CLASSIFICEREN naar een
// constraint uit het vaste vocabulaire. Het model mag niets auteuren:
//   - geen nieuwe regeltekst, geen nieuwe severity
//   - `forbidden-words` alleen met woorden die letterlijk in de richtlijn
//     staan; noemt de richtlijn er geen, dan vervalt de regel
//   - géén `forbidden-pattern` — regex laten schrijven door een model is
//     een injectie- en false-positive-risico
//   - perspectief-regels lopen via `forbidden-pronouns`, waarvan de
//     woordenlijst ingebouwd is
// Alles wat niet mechanisch controleerbaar is ("laat rust doorklinken")
// hoort géén regel te worden en wordt weggelaten.
//
// Output wordt strikt Zod-gevalideerd; wat niet valideert wordt weggegooid.
// Zie ADR 2026-08-14-styleguide-rules-in-fval, D4/D5.
// ============================================================

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { anthropicClient } from "@/lib/ai/anthropic-client";
import { clearStyleguideRuleCache } from "@/lib/brand-fidelity/styleguide-rule-compiler";
import {
  resolveLocaleForBrandWithSource,
  type Locale,
} from "@/lib/brand-fidelity/heuristics/locale-resolver";
import { stripAnalyzerMarkers } from "./analyzer-markers";
import {
  parseRuleConstraint,
  PRONOUN_GROUPS,
  type PronounLanguage,
  type TextRuleConstraint,
} from "./rule-constraints";

/** Checks die het model mag voorstellen — bewust smaller dan het volledige vocabulaire. */
const ALLOWED_CHECKS = [
  "no-emoji",
  "no-exclamation-marks",
  "forbidden-pronouns",
  "max-sentence-words",
  "forbidden-words",
] as const;
// `required-phrase` staat bewust NIET in deze lijst. Een verplichte frase geldt
// voor élke tekst, terwijl richtlijnen erover vrijwel altijd voorwaardelijk zijn
// ("gebruik de pay-off waar dat past"). Zo'n regel produceert dan bij elke tekst
// zonder die frase een violation. Handmatig auteuren blijft mogelijk.

/**
 * Formuleringen die een echt maximum aankondigen. Een richtlijn zonder één
 * hiervan beschrijft een gemiddelde of een typische lengte — geen grens.
 */
const MAXIMUM_PHRASING =
  /\b(maximaal|maximum|max\.?|hooguit|ten hoogste|niet langer dan|no longer than|at most|no more than|up to)\b/i;

/**
 * Richtlijnen die maar over een deel van de tekst gaan — één element (kop,
 * CTA, bijschrift) of één positie ("aan het begin van zinnen"). De checks in
 * dit vocabulaire werken document-breed; zo'n richtlijn wordt daardoor
 * strenger dan bedoeld ("koppen max 8 woorden" keurt élke gewone zin af).
 * Het datamodel kent nog geen scope, dus deze richtlijnen vervallen.
 */
const SCOPED_GUIDELINE = new RegExp(
  [
    // element-scope
    "\\b(headline|headlines|kop|koppen|titel|title|subtitle|subkop|tussenkop",
    "|cta|call.to.action|button|knop|caption|bijschrift|onderschrift",
    "|bullet|bullets|alt.?text)\\b",
    // positie-scope
    "|\\b(aan het begin|begin van (de )?zin|eerste zin|openingszin",
    "|at the (start|beginning)|sentence-initial|first sentence)\\b",
  ].join(""),
  "i",
);

export interface StructuredRuleProposal {
  /** De bronrichtlijn, marker-vrij — bewijs bij de regel (M5: geen regel zonder grond). */
  guideline: string;
  /** Korte regeltitel in de taal van de richtlijn. */
  title: string;
  constraint: TextRuleConstraint;
  /** RECOMMENDED-gemarkeerde richtlijnen zijn advies, geen waarneming. */
  provenance: "observed" | "recommended";
}

const proposalSchema = z.object({
  index: z.number().int().min(0),
  title: z.string().trim().min(3).max(200),
  constraint: z.record(z.string(), z.unknown()),
});

const responseSchema = z.object({ rules: z.array(proposalSchema) });

function buildPrompt(guidelines: string[], language: PronounLanguage): string {
  const numbered = guidelines.map((g, i) => `${i}. ${g}`).join("\n");
  return [
    "Hieronder staan schrijfrichtlijnen van één merk. Bepaal per richtlijn of hij",
    "MECHANISCH CONTROLEERBAAR is op een stuk tekst, en zo ja: met welke check.",
    "",
    "Toegestane checks (gebruik exact deze vormen):",
    '- { "modality": "text", "check": "no-emoji" }',
    '- { "modality": "text", "check": "no-exclamation-marks" }',
    `- { "modality": "text", "check": "forbidden-pronouns", "group": "<${PRONOUN_GROUPS.join(" | ")}>", "language": "${language}" }`,
    '- { "modality": "text", "check": "max-sentence-words", "max": <getal> }',
    '- { "modality": "text", "check": "forbidden-words", "words": ["..."] }',
    "",
    "Harde eisen:",
    "- Verzin NIETS. Gebruik alleen woorden en getallen die letterlijk in de richtlijn staan.",
    '- "forbidden-words" mag ALLEEN als de richtlijn de te vermijden woorden zelf noemt.',
    '  Een richtlijn als "vermijd corporate jargon" noemt geen woorden → weglaten.',
    '- "max-sentence-words" mag ALLEEN bij een expliciet MAXIMUM ("maximaal 15 woorden",',
    '  "niet langer dan 20 woorden", "hooguit"). Een gemiddelde of typische lengte',
    '  ("gemiddeld 15-20 woorden", "short, punchy sentences") is GEEN maximum —',
    '  bij een gemiddelde is de helft van de zinnen per definitie langer. Weglaten.',
    '  Staat er een maximum-reeks ("maximaal 12-15 woorden"), neem dan de bovengrens.',
    '- Een richtlijn over perspectief ("derde persoon", "nooit u", "altijd je") wordt',
    '  "forbidden-pronouns" met de groep die VERBODEN is.',
    "- Richtlijnen over gevoel, ritme, structuur of onderwerpkeuze zijn niet controleerbaar:",
    "  laat die weg. Liever te weinig regels dan één foute.",
    "- ELKE regel geldt straks voor ÁLLE content van dit merk, en wordt op de hele tekst",
    "  toegepast. Laat daarom weg:",
    '  · richtlijnen die gelden voor één kanaal of pagina ("op social media", "op de website",',
    '    "in nieuwsbrieven", "op <domein>") — die kunnen hier niet begrensd worden;',
    '  · richtlijnen over één tekst-element ("koppen maximaal 8 woorden", "CTA\'s kort",',
    '    "bijschriften zonder punt") — die zouden op gewone zinnen worden losgelaten;',
    '  · voorwaardelijke richtlijnen ("waar dat past", "waar mogelijk", "indien relevant",',
    '    "bij voorkeur") — een regel die soms geldt, is geen regel.',
    '- "title" is een korte, imperatieve regel in de taal van de richtlijn.',
    "",
    "Richtlijnen:",
    numbered,
    "",
    'Antwoord met uitsluitend JSON: { "rules": [ { "index": <nummer>, "title": "...", "constraint": {...} } ] }',
    "Laat richtlijnen die niet controleerbaar zijn volledig weg uit de array.",
  ].join("\n");
}

/** Haal het eerste/laatste JSON-object uit een modelantwoord (markdown-fences tolerant). */
function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fences = Array.from(trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/g));
  for (const block of [...fences].reverse()) {
    try {
      return JSON.parse(block[1]);
    } catch {
      // volgende proberen
    }
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Classificeer schrijfrichtlijnen naar afdwingbare tekst-constraints.
 *
 * @param params.guidelines - ruwe richtlijnen (OBSERVED/RECOMMENDED-markers mogen erin staan)
 * @param params.language - taal voor de perspectief-tabel
 * @returns alleen voorstellen die het vocabulaire-schema halen; nooit verzonnen regels
 */
export async function structureVoiceGuidelines(params: {
  guidelines: string[];
  language: PronounLanguage;
}): Promise<StructuredRuleProposal[]> {
  const cleaned = params.guidelines
    .map((raw) => ({
      raw,
      text: stripAnalyzerMarkers(raw),
      provenance: /^\s*recommended:/i.test(raw) ? ("recommended" as const) : ("observed" as const),
    }))
    .filter((g) => g.text.length > 0);

  if (cleaned.length === 0) return [];

  const completion = await anthropicClient.createChatCompletion(
    [
      {
        role: "system",
        content:
          "Je bent een merkregel-classificeerder. Je zet bestaande richtlijnen om in " +
          "machinaal controleerbare checks. Je verzint nooit regels, woorden of getallen " +
          "die niet in de aangeleverde richtlijn staan. Je antwoordt uitsluitend met JSON.",
      },
      { role: "user", content: buildPrompt(cleaned.map((g) => g.text), params.language) },
    ],
    // Het output-budget is inclusief thinking-tokens: met 2000 liep een
    // workspace met veel richtlijnen op truncatie terwijl er nog geen 500
    // tekens echte output was (zelfde klasse als gotchas.md 2026-07-12).
    // Schaal mee met het aantal richtlijnen; ruim onder het non-streaming
    // SDK-plafond van 21.333.
    {
      useCase: "STRUCTURED",
      maxTokens: Math.min(16_000, 4_000 + cleaned.length * 400),
    },
  );

  const parsed = responseSchema.safeParse(extractJson(completion.content));
  if (!parsed.success) {
    console.warn("[rule-structurer] modelantwoord voldoet niet aan het schema — 0 regels");
    return [];
  }

  const out: StructuredRuleProposal[] = [];
  for (const item of parsed.data.rules) {
    const source = cleaned[item.index];
    if (!source) continue;

    const constraintRecord = item.constraint as Record<string, unknown>;
    // Het model mag maar een deel van het vocabulaire gebruiken; de rest zou
    // authoring zijn (regex) of buiten deze bron vallen (visueel).
    if (!ALLOWED_CHECKS.includes(constraintRecord.check as (typeof ALLOWED_CHECKS)[number])) {
      continue;
    }

    const constraint = parseRuleConstraint(
      { ...constraintRecord, derivedBy: "ai" },
      (reason) => console.warn(`[rule-structurer] constraint afgekeurd (${reason})`),
    );
    if (!constraint || constraint.modality !== "text") continue;

    // Deterministische vangnetten — de prompt vraagt dit al, maar dat mag geen
    // garantie zijn.
    if (SCOPED_GUIDELINE.test(source.text)) {
      console.warn(
        `[rule-structurer] regel afgewezen — richtlijn geldt maar voor een deel van de ` +
          `tekst (element of positie): "${source.text.slice(0, 80)}"`,
      );
      continue;
    }

    // Een zinslengte-regel mag alleen uit een expliciet maximum komen.
    // "gemiddeld 15-20 woorden" als max betekent dat per definitie de helft
    // van de zinnen een violation oplevert.
    if (constraint.check === "max-sentence-words" && !MAXIMUM_PHRASING.test(source.text)) {
      console.warn(
        `[rule-structurer] zinslengte-regel afgewezen — richtlijn noemt geen maximum: ` +
          `"${source.text.slice(0, 80)}"`,
      );
      continue;
    }

    out.push({
      guideline: source.text,
      title: item.title.trim(),
      constraint,
      provenance: source.provenance,
    });
  }

  return dropContradictoryPronounRules(out);
}

/**
 * Vangnet tegen elkaar uitsluitende perspectief-regels.
 *
 * Merken met kanaalspecifieke richtlijnen ("u-vorm op de website, je-vorm op
 * social") leveren twee regels op die samen élke tekst afkeuren: wat de ene
 * verbiedt, eist de andere. De prompt vraagt al om zulke kanaalregels weg te
 * laten, maar dat mag geen enkele garantie zijn — dit is de deterministische
 * check. Bij een tegenstelling vervallen beide regels; het merk moet dan zelf
 * kiezen (of wachten op kanaal-scoping in het datamodel).
 */
function dropContradictoryPronounRules(
  proposals: StructuredRuleProposal[],
): StructuredRuleProposal[] {
  const groups = new Set(
    proposals
      .filter((p) => p.constraint.check === "forbidden-pronouns")
      .map((p) => (p.constraint as { group: string }).group),
  );
  if (!groups.has("second-person-formal") || !groups.has("second-person-informal")) {
    return proposals;
  }

  console.warn(
    "[rule-structurer] tegenstrijdige perspectief-regels (u-vorm én je-vorm verboden) — " +
      "beide vervallen; dit merk heeft kanaalspecifieke richtlijnen die dit model niet kan begrenzen.",
  );
  return proposals.filter(
    (p) =>
      p.constraint.check !== "forbidden-pronouns" ||
      !["second-person-formal", "second-person-informal"].includes(
        (p.constraint as { group: string }).group,
      ),
  );
}

// ─── Persistentie ───────────────────────────────────

/** Sectiesleutel waaronder afgeleide tekst-regels landen. */
export const VOICE_RULE_SECTION = "voice";

/** Sources die de structurer mag overschrijven — `user` blijft altijd staan. */
const OVERWRITABLE_SOURCES = ["derived", "recommended"];

export type VoiceRuleSyncStatus =
  | "ok"
  | "no-styleguide"
  | "no-voiceguide"
  | "gated"
  | "no-guidelines"
  | "unsupported-language";

export interface VoiceRuleSyncResult {
  status: VoiceRuleSyncStatus;
  proposals: StructuredRuleProposal[];
  /** Waar de taalkeuze vandaan kwam — mis-configuratie is hier de grootste valkuil. */
  language?: PronounLanguage;
  localeSource?: string;
  replaced: number;
  written: number;
}

/**
 * Map de F-VAL-locale naar de taal van de voornaamwoord-tabel.
 *
 * Bewust dezelfde resolutie als de heuristics-lane (`resolveLocaleForBrand`):
 * één bron voor "in welke taal schrijft dit merk" voorkomt dat twee delen van
 * dezelfde pijler een andere taal aannemen. Let op de bekende valkuil: een
 * workspace waarvan `contentLanguage` niet klopt (gotcha 2026-05-10, LINFI
 * stond op 'en' terwijl het merk Nederlands schrijft) krijgt hier ook de
 * verkeerde tabel — dat is een datafout, geen codefout, en daarom rapporteren
 * we de herkomst mee.
 */
function toPronounLanguage(locale: Locale): PronounLanguage | null {
  if (locale.startsWith("nl")) return "nl";
  if (locale.startsWith("en")) return "en";
  return null;
}

/**
 * Classificeer de schrijfrichtlijnen van een workspace en schrijf het resultaat
 * weg als `StyleguideRule` in de sectie `voice`.
 *
 * Idempotent: vervangt alleen regels met source `derived`/`recommended` in die
 * sectie. Handmatig geschreven regels (`source: 'user'`) blijven staan.
 *
 * @param workspaceId - de workspace
 * @param opts.dryRun - alleen voorstellen teruggeven, niets schrijven
 */
export async function syncStructuredVoiceRules(
  workspaceId: string,
  opts: { dryRun?: boolean } = {},
): Promise<VoiceRuleSyncResult> {
  const empty = { proposals: [], replaced: 0, written: 0 };

  const [styleguide, voiceguide, resolved] = await Promise.all([
    prisma.brandStyleguide.findUnique({ where: { workspaceId }, select: { id: true } }),
    prisma.brandVoiceguide.findUnique({
      where: { workspaceId },
      select: {
        writingGuidelines: true,
        contentGuidelines: true,
        guidelinesSavedForAi: true,
      },
    }),
    resolveLocaleForBrandWithSource(workspaceId),
  ]);

  if (!styleguide) return { status: "no-styleguide", ...empty };
  if (!voiceguide) return { status: "no-voiceguide", ...empty };
  if (!voiceguide.guidelinesSavedForAi) return { status: "gated", ...empty };

  const guidelines = [...voiceguide.writingGuidelines, ...voiceguide.contentGuidelines];
  if (guidelines.length === 0) return { status: "no-guidelines", ...empty };

  const language = toPronounLanguage(resolved.locale);
  const localeSource = `${resolved.locale} (${resolved.source})`;
  if (!language) return { status: "unsupported-language", localeSource, ...empty };

  const proposals = await structureVoiceGuidelines({ guidelines, language });

  if (opts.dryRun || proposals.length === 0) {
    return { status: "ok", proposals, language, localeSource, replaced: 0, written: 0 };
  }

  const deleted = await prisma.styleguideRule.deleteMany({
    where: {
      styleguideId: styleguide.id,
      section: VOICE_RULE_SECTION,
      source: { in: OVERWRITABLE_SOURCES },
    },
  });
  const created = await prisma.styleguideRule.createMany({
    data: proposals.map((p) => ({
      styleguideId: styleguide.id,
      section: VOICE_RULE_SECTION,
      kind: "HARD_RULE" as const,
      // De AI zet nooit severity — alles blijft ADVISORY (gewicht 1).
      severity: "ADVISORY" as const,
      source: p.provenance === "recommended" ? "recommended" : "derived",
      title: p.title,
      description: `Afgeleid uit schrijfrichtlijn: "${p.guideline}"`,
      constraint: p.constraint,
    })),
  });
  clearStyleguideRuleCache(workspaceId);

  return {
    status: "ok",
    proposals,
    language,
    localeSource,
    replaced: deleted.count,
    written: created.count,
  };
}
