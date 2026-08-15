import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { cachedJson, setCache } from "@/lib/api/cache";
import { CACHE_TTL, cacheKeys } from "@/lib/api/cache-keys";
import {
  aggregateViolations,
  selectCurationSignals,
  type LiveRule,
  type ViolationRow,
} from "@/lib/brandstyle/rule-violation-stats";
import { compileStyleguideRules } from "@/lib/brand-fidelity/styleguide-rule-checks";
import { expandStemVariants } from "@/lib/brand-fidelity/brand-rule-sync";
import type {
  CalibrationAskAction,
  RuleViolationInput,
} from "@/lib/brandstyle/calibration-report";

// =============================================================
// GET /api/brandstyle/curation-signals — feedback-loop (R4)
//
// "Regel X wordt in 19% van de generaties overtreden — te streng of verkeerd
// geëxtraheerd?" De logging bestond al (ContentFidelityScore + geneste
// BrandReviewFinding met `evidence.ruleId/ruleType/pattern`); dit is de
// aggregatie en de vertaling naar uitvoerbare correcties.
//
// Aggregatie gaat op `(ruleType, pattern)` en NIET op `ruleId` — zie
// rule-violation-stats.ts: rule-sync doet delete+create, dus ID's verweesd
// raken bij elke sync (op de echte data: 3 van 24 nog levend).
// =============================================================

/**
 * Venster = de laatste N generaties, niet de laatste N dagen.
 *
 * Een kalendervenster leek logischer tot het harnas het weerlegde: het gebruik
 * is bursty (één workspace deed 178 generaties in vijf weken en daarna niets),
 * dus een 30-dagenvenster leverde nul signalen op terwijl er honderden
 * metingen lagen. Op aantal begrenzen werkt voor beide gebruikspatronen, en de
 * noemer is dan precies "de generaties waar we naar gekeken hebben" — wat ook
 * eerlijker uit te leggen is in de UI.
 */
const WINDOW_GENERATIONS = 200;
const FINDING_FETCH_CAP = 20_000;

type VoiceguideField = "wordsWeAvoid" | "vocabularyDont" | "antiPatterns";

/**
 * De drie streams die `syncVoiceguideToRules` schrijft.
 *
 * `auto:wordsWeAvoid` (zónder `voiceguide.`) staat hier bewust NIET tussen: dat
 * is de legacy-stream uit `BrandPersonality.frameworkData`, die door een andere
 * sync wordt beheerd. Een PATCH op de voiceguide raakt die rijen niet, dus een
 * knop ervoor zou óf falen óf slagen zonder iets op te lossen.
 */
const VOICEGUIDE_SOURCE_FIELDS: Record<string, VoiceguideField> = {
  "auto:voiceguide.wordsWeAvoid": "wordsWeAvoid",
  "auto:voiceguide.vocabularyDont": "vocabularyDont",
  "auto:voiceguide.antiPatterns": "antiPatterns",
};

/**
 * Bouwt `regel-pattern → { term, velden }`.
 *
 * Onmisbaar, want de sync draait elke term door `expandStemVariants`: de regel
 * met pattern "exclusieve" hoort bij de voiceguide-term "exclusief". Filteren
 * op het pattern vindt niets, waarna de correctie-knop gegarandeerd faalt — en
 * het label een woord toont dat de gebruiker nooit heeft ingetypt.
 */
function buildSourceTermIndex(
  voiceguide: Record<VoiceguideField, string[]> | null,
): Map<string, { term: string; fields: Set<VoiceguideField> }> {
  const index = new Map<string, { term: string; fields: Set<VoiceguideField> }>();
  if (!voiceguide) return index;
  for (const field of ["wordsWeAvoid", "vocabularyDont", "antiPatterns"] as const) {
    for (const term of voiceguide[field] ?? []) {
      for (const variant of expandStemVariants(term)) {
        const entry = index.get(variant);
        if (entry) entry.fields.add(field);
        else index.set(variant, { term, fields: new Set([field]) });
      }
    }
  }
  return index;
}

/**
 * Bouwt de uitvoerbare correcties bij een regel. Wélke laag je raakt hangt af
 * van waar de regel vandaan komt: een uit de voiceguide gesyncte regel is niet
 * direct bewerkbaar (`/api/brand-rules/[id]` weigert `auto:*` expliciet), dus
 * daar is het bronveld het curatiepunt — haal de term daaruit en de re-sync
 * ruimt de regel op.
 */
function buildActions(rule: LiveRule): CalibrationAskAction[] {
  switch (rule.kind) {
    case "voiceguide-synced":
      // Zonder resolveerbare bron-term is er geen werkende correctie. Dan
      // liever géén knop dan een knop die zeker faalt.
      if (!rule.sourceTerm || !rule.sourceFields?.length) return [];
      return [
        {
          kind: "remove-voiceguide-term",
          label: `Remove "${rule.sourceTerm}" from your voice guide`,
          ruleId: rule.id,
          term: rule.sourceTerm,
          sourceFields: rule.sourceFields,
        },
      ];
    case "brand-rule-manual":
      return [
        ...(rule.severity !== "info"
          ? [
              {
                kind: "weaken-brand-rule" as const,
                label: "Make it advisory",
                ruleId: rule.id,
              },
            ]
          : []),
        { kind: "delete-brand-rule", label: "Delete this rule", ruleId: rule.id },
      ];
    case "styleguide-rule":
      // De structurer maakt élke regel ADVISORY ("de AI zet nooit severity"),
      // dus alleen een verzwak-knop aanbieden zou betekenen dat deze hele lane
      // knoploze asks oplevert — de vlag-zonder-schrijver-val opnieuw. Voor een
      // regel die al advisory is, is verwijderen de enige zinvolle correctie.
      return rule.severity === "BLOCKING"
        ? [
            {
              kind: "weaken-styleguide-rule",
              label: "Make it advisory",
              ruleId: rule.id,
            },
          ]
        : [
            {
              kind: "delete-styleguide-rule",
              label: "Delete this rule",
              ruleId: rule.id,
            },
          ];
  }
}

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    // Onder de brandstyle-prefix, zodat de invalidatie die élke
    // brandstyle-mutatieroute al doet deze signalen meeneemt — een regel die je
    // net wegcureerde hoort niet nog een minuut in het paneel te staan.
    const cacheKey = `${cacheKeys.prefixes.brandstyle(workspaceId)}:curation-signals`;
    const hit = cachedJson(cacheKey);
    if (hit) return hit;

    // Eerst het venster vaststellen, dan pas de findings — zo is de noemer
    // gegarandeerd dezelfde verzameling als de teller.
    const window = await prisma.contentFidelityScore.findMany({
      where: { workspaceId },
      select: { id: true },
      orderBy: { scoredAt: "desc" },
      take: WINDOW_GENERATIONS,
    });
    const generationsTotal = window.length;
    const windowIds = window.map((s) => s.id);

    const [findings, brandRules, voiceguide, styleguide] = await Promise.all([
      windowIds.length === 0
        ? Promise.resolve([])
        : prisma.brandReviewFinding.findMany({
            where: { workspaceId, fidelityScoreId: { in: windowIds } },
            select: { fidelityScoreId: true, evidence: true },
            // Deterministische volgorde: zonder `orderBy` bepaalt de heap welke
            // rijen de cap overleven, en dat correleert met inserttijd — dan
            // vallen juist de nieuwste generaties af terwijl de noemer blijft
            // staan, en rapporteert elke regel structureel te laag.
            orderBy: [{ fidelityScoreId: "asc" }, { id: "asc" }],
            take: FINDING_FETCH_CAP,
          }),
      prisma.brandRule.findMany({
        where: { workspaceId, isActive: true },
        select: { id: true, ruleType: true, pattern: true, severity: true, source: true },
        // Deterministisch: bij twee rijen met hetzelfde pattern (dezelfde term
        // uit twee bronvelden) moet dezelfde regel winnen bij elke request.
        orderBy: [{ pattern: "asc" }, { id: "asc" }],
      }),
      prisma.brandVoiceguide.findUnique({
        where: { workspaceId },
        select: { wordsWeAvoid: true, vocabularyDont: true, antiPatterns: true },
      }),
      prisma.brandStyleguide.findUnique({
        where: { workspaceId },
        select: {
          rules: {
            select: {
              id: true,
              section: true,
              kind: true,
              severity: true,
              title: true,
              description: true,
              constraint: true,
            },
          },
        },
      }),
    ]);

    const rows: ViolationRow[] = [];
    for (const f of findings) {
      const e = (f.evidence ?? null) as Record<string, unknown> | null;
      if (!e || typeof e.ruleId !== "string") continue;
      rows.push({
        generationId: f.fidelityScoreId as string,
        ruleId: e.ruleId,
        ruleType: typeof e.ruleType === "string" ? e.ruleType : null,
        pattern: typeof e.pattern === "string" ? e.pattern : null,
      });
    }

    const sourceTerms = buildSourceTermIndex(voiceguide);

    const liveRules: LiveRule[] = brandRules.map((r) => {
      const isAuto = r.source.startsWith("auto:");
      const field = VOICEGUIDE_SOURCE_FIELDS[r.source];
      // Alleen wanneer de regel uit een voiceguide-stream komt én we de
      // bron-term kunnen terugvinden, is er een werkende correctie. Een
      // legacy-regel (`auto:wordsWeAvoid`) valt hier vanzelf buiten.
      const resolved = field ? sourceTerms.get(r.pattern.toLowerCase()) : undefined;
      return {
        id: r.id,
        ruleType: r.ruleType,
        pattern: r.pattern,
        severity: r.severity,
        kind: isAuto ? "voiceguide-synced" : "brand-rule-manual",
        sourceTerm: resolved?.term,
        sourceFields: resolved ? [...resolved.fields] : undefined,
      };
    });

    // StyleguideRule-lane: de `pattern` in een violation is `describePattern()`
    // van de constraint, geen letterlijke term. Door de levende regels door
    // dezelfde compiler te halen die de violations produceerde, krijgen we
    // gegarandeerd dezelfde sleutel — de enige manier om hier niet stil naast
    // te grijpen.
    const compiled = compileStyleguideRules(
      (styleguide?.rules ?? []).map((r) => ({
        id: r.id,
        section: r.section,
        kind: r.kind,
        severity: r.severity,
        title: r.title,
        description: r.description,
        constraint: r.constraint,
      })),
    );
    for (const c of compiled.compiled) {
      liveRules.push({
        id: c.ruleId.slice(c.ruleId.lastIndexOf(":") + 1),
        ruleType: c.ruleType,
        pattern: c.pattern,
        // `severity` is hier al vertaald naar error/warning; terug naar het
        // BLOCKING/ADVISORY-vocabulaire dat de PATCH-route verwacht.
        severity: c.severity === "error" ? "BLOCKING" : "ADVISORY",
        kind: "styleguide-rule",
      });
    }

    const stats = selectCurationSignals(
      aggregateViolations(rows, generationsTotal, liveRules),
    );

    const signals: RuleViolationInput[] = stats.map((s) => ({
      key: s.key,
      label: s.rule.pattern,
      generationsHit: s.generationsHit,
      generationsTotal: s.generationsTotal,
      ratePercent: Math.round(s.rate * 100),
      actions: buildActions(s.rule),
      visibleInManifest: s.rule.kind === "styleguide-rule",
    }));

    const payload = {
      signals,
      window: { generations: generationsTotal, cap: WINDOW_GENERATIONS },
      // Zichtbaar maken dat er wél gemeten is maar niets de drempel haalde —
      // anders leest een lege lijst als "de meting draait niet".
      evaluated: stats.length === 0 && generationsTotal > 0,
      truncated: findings.length >= FINDING_FETCH_CAP,
      styleguideRuleCount: styleguide?.rules.length ?? 0,
    };

    setCache(cacheKey, payload, CACHE_TTL.DASHBOARD);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[GET /api/brandstyle/curation-signals]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
