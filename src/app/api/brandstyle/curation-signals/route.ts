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
  type WindowGeneration,
} from "@/lib/brandstyle/rule-violation-stats";
import { compileStyleguideRules } from "@/lib/brand-fidelity/styleguide-rule-checks";
import { expandStemVariants } from "@/lib/brand-fidelity/brand-rule-sync";
import { reviewFeedbackToCalibrationInput } from "@/lib/brandstyle/review-sections";
import { MIN_GENERATIONS } from "@/lib/brandstyle/rule-violation-stats";
import type {
  CalibrationAskAction,
  OverrideSignalInput,
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
/**
 * Drempels voor het override-signaal (R4, tweede poot). Percentage én absoluut
 * aantal, om dezelfde reden als bij de regels: 1 van de 2 kleuren is 50% maar
 * zegt niets.
 */
const MIN_OVERRIDE_RATE = 0.25;
const MIN_OVERRIDES = 3;
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
    const windowRows = await prisma.contentFidelityScore.findMany({
      where: { workspaceId },
      select: { id: true, scoredAt: true },
      orderBy: { scoredAt: "desc" },
      take: WINDOW_GENERATIONS,
    });
    const generationsTotal = windowRows.length;
    const windowIds = windowRows.map((s) => s.id);

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
        select: {
          id: true, ruleType: true, pattern: true, severity: true, source: true,
          // `createdAt` begrenst de noemer: een regel kan niet overtreden zijn
          // in generaties van vóór zijn bestaan.
          createdAt: true,
          contentTypeFilter: true,
        },
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
          id: true,
          dismissedCurationKeys: true,
          // R4, derde poot: wat de gebruiker over de extractie schreef.
          reviews: { select: { section: true, status: true, feedback: true } },
          rules: {
            select: {
              id: true,
              section: true,
              kind: true,
              severity: true,
              title: true,
              description: true,
              constraint: true,
              createdAt: true,
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
        createdAt: r.createdAt,
        contentTypeFilter: r.contentTypeFilter ?? undefined,
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
    const styleguideRuleCreatedAt = new Map(
      (styleguide?.rules ?? []).map((r) => [r.id, r.createdAt]),
    );
    for (const c of compiled.compiled) {
      const ruleId = c.ruleId.slice(c.ruleId.lastIndexOf(":") + 1);
      liveRules.push({
        id: ruleId,
        ruleType: c.ruleType,
        pattern: c.pattern,
        // `severity` is hier al vertaald naar error/warning; terug naar het
        // BLOCKING/ADVISORY-vocabulaire dat de PATCH-route verwacht.
        severity: c.severity === "error" ? "BLOCKING" : "ADVISORY",
        kind: "styleguide-rule",
        // Valt terug op epoch als de rij onverwacht ontbreekt: dan geldt het
        // volle venster, wat het huidige gedrag is — nooit strenger dan nu.
        createdAt: styleguideRuleCreatedAt.get(ruleId) ?? new Date(0),
      });
    }

    // Content-types alleen ophalen als er iets te filteren valt. Vandaag heeft
    // géén enkele regel een `contentTypeFilter`, dus deze join kost normaal
    // niets — maar zodra iemand er één zet, klopt de noemer meteen.
    const needsContentType = liveRules.some((r) => (r.contentTypeFilter?.length ?? 0) > 0);
    let contentTypeById = new Map<string, string | null>();
    if (needsContentType && windowIds.length > 0) {
      const withType = await prisma.contentFidelityScore.findMany({
        where: { id: { in: windowIds } },
        select: {
          id: true,
          contentVersion: { select: { deliverable: { select: { contentType: true } } } },
        },
      });
      contentTypeById = new Map(
        withType.map((r) => [r.id, r.contentVersion?.deliverable?.contentType ?? null]),
      );
    }

    const window: WindowGeneration[] = windowRows.map((r) => ({
      id: r.id,
      scoredAt: r.scoredAt,
      contentType: needsContentType ? contentTypeById.get(r.id) ?? null : undefined,
    }));

    const stats = selectCurationSignals(
      aggregateViolations(rows, window, liveRules),
      { dismissedKeys: styleguide?.dismissedCurationKeys ?? [] },
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

    const styleguideId = styleguide?.id;
    const reviewFeedback = reviewFeedbackToCalibrationInput(styleguide?.reviews ?? []);

    // ── R4, tweede poot: wat de gebruiker zelf corrigeerde ──
    //
    // `source: 'user'` alléén is hier NIET de juiste maatstaf: dat veld wordt
    // door drie paden gezet — een handmatig toegevoegde kleur (POST), een
    // gecorrigeerde kleur (PATCH tags), en de document-backfill. Alleen de
    // tweede zegt iets over de extractiekwaliteit; de andere twee zouden een
    // valse "je corrigeerde 100%"-melding opleveren op workspaces waar niemand
    // iets corrigeerde.
    //
    // `detectorSource` is de exacte discriminator: dat veld wordt uitsluitend
    // door de kleur-resolver van de scraper gezet. De ratio is dus "van wat wij
    // extraheerden, hoeveel heb jij moeten corrigeren" — precies de vraag.
    // Dezelfde discriminator als de verversings-guard in #465.
    const overrideSignals: OverrideSignalInput[] = [];
    if (styleguideId) {
      const [extracted, corrected] = await Promise.all([
        prisma.styleguideColor.count({
          where: { styleguideId, detectorSource: { not: null } },
        }),
        prisma.styleguideColor.count({
          where: { styleguideId, detectorSource: { not: null }, source: "user" },
        }),
      ]);
      if (
        extracted > 0 &&
        corrected >= MIN_OVERRIDES &&
        corrected / extracted >= MIN_OVERRIDE_RATE
      ) {
        overrideSignals.push({
          section: "colors",
          label: "extracted colors",
          overridden: corrected,
          total: extracted,
        });
      }
    }

    const payload = {
      signals,
      overrideSignals,
      reviewFeedback,
      window: { generations: generationsTotal, cap: WINDOW_GENERATIONS },
      // Onderscheid tussen "te weinig data" en "gemeten, niets boven de
      // drempel". Zonder dat leest een lege lijst als "niets aan de hand",
      // terwijl er misschien helemaal niet gemeten is.
      status:
        generationsTotal < MIN_GENERATIONS
          ? ("insufficient-data" as const)
          : stats.length === 0
            ? ("nothing-above-threshold" as const)
            : ("signals" as const),
      minGenerations: MIN_GENERATIONS,
      // Zonder deze teller ziet iemand die alles wegklikte een groen "alles in
      // orde" — met geen enkel spoor dat er iets onderdrukt is, en geen weg
      // terug.
      dismissedCount: styleguide?.dismissedCurationKeys.length ?? 0,
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
