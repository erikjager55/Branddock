/**
 * scripts/smoke-tests/deep-research.ts
 *
 * Deterministische smoke-test voor de Deep Research-orchestrator
 * (`runDeepResearch`). GEEN echte API-kosten: alle 6 fasen + brand-context
 * worden geïnjecteerd als fakes via `DeepResearchDeps`, dus er gaat geen
 * netwerk- of AI-SDK-call uit. Geen DB/prisma nodig.
 *
 * Asserties:
 *   1. Stabiele 1-based citatie-indices op de fake-bronnen.
 *   2. `[n]`-citaties → SourceRef.used correct + er IS een `## Sources`-sectie.
 *   3. report.suggestedCategory ∈ RESOURCE_CATEGORIES.
 *   4. Welgevormde event-volgorde: elke fase een `phase` start+done, precies
 *      één terminaal resultaat (de orchestrator retourneert het rapport; hij
 *      emit GEEN `complete`/`error` — dat doet de route, zie notes).
 *   5. Abort ná de search-fase → `runDeepResearch` gooit een AbortError en
 *      retourneert GEEN compleet rapport.
 *   6. Als de search-fase gooit (gefaalde exa/scholar/grounding) maar er is
 *      grounding-tekst-fallback, completeert de run alsnog + een warning in
 *      report.warnings.
 *
 * BELANGRIJKE OPMERKING over de echte deps-vorm (geen verzonnen API):
 *   - De orchestrator EMIT zelf geen `complete`/`error`-event; die zitten wel
 *     in de `DeepResearchEvent`-union maar worden door de SSE-route gestuurd.
 *     Het "precies één terminaal resultaat" wordt daarom geverifieerd op de
 *     retourwaarde (rapport) c.q. de geworpen AbortError, niet op een event.
 *   - Search-degradatie naar de grounding-baseline werkt zo: een gefaalde
 *     `searchFn` levert via `ensureContent()` alsnog inhoud zolang
 *     `groundingTexts` gevuld is. We faken dat door searchFn een SearchOutput
 *     met lege `sources` + gevulde `groundingTexts` + een warning te laten
 *     retourneren (i.p.v. te gooien): een gegooide searchFn zonder eigen
 *     grounding zou de hele run laten falen ("No sources found"). De fake
 *     readFn projecteert die grounding-tekst dan op genummerde bronnen.
 *
 * Run: `npm run smoke:deep-research`
 *
 * Waarom de npm-runner `node --env-file-if-exists=.env` gebruikt i.p.v. kale
 * `tsx`: de orchestrator importeert STATISCH `@/lib/ai/brand-context`, dat op
 * module-load `@/lib/prisma` laadt en gooit zonder `DATABASE_URL`. Onze fakes
 * vervangen `brandContextFn` (de echte wordt nooit aangeroepen), maar de
 * static-import-keten draait toch. Het laden van `.env` voldoet daaraan zonder
 * dat er een DB-call of API-call plaatsvindt.
 */

import {
  runDeepResearch,
  type DeepResearchDeps,
  type RunDeepResearchInput,
} from "@/lib/knowledge-research/orchestrator";
import type {
  DeepResearchEvent,
  DeepResearchReport,
  ResearchPhase,
  SourceRef,
} from "@/lib/knowledge-research/types";
import type { NumberedSource } from "@/lib/knowledge-research/prompts";
import type { ResearchPlan } from "@/lib/knowledge-research/phases/plan";
import type { SearchOutput } from "@/lib/knowledge-research/phases/search";
import type { ReadOutput } from "@/lib/knowledge-research/phases/read";
import type { VerifyOutput } from "@/lib/knowledge-research/phases/verify";
import type { SynthesizeOutput } from "@/lib/knowledge-research/phases/synthesize";
import type { FinalizeOutput } from "@/lib/knowledge-research/phases/finalize";
import {
  RESOURCE_CATEGORIES,
  coerceCategory,
} from "@/lib/knowledge-resources/categories";

let pass = 0;
let fail = 0;

function ok(label: string, cond: boolean): void {
  console.log(`  ${cond ? "PASS" : "FAIL"} ${label}`);
  if (cond) pass++;
  else fail++;
}

// ─── Vaste fake-bronnen (3 bronnen, stabiele 1-based indices) ──

const FAKE_SOURCES: SourceRef[] = [
  { index: 1, url: "https://example.com/a", title: "Bron A", origin: "grounding", used: false },
  { index: 2, url: "https://example.org/b", title: "Bron B", origin: "exa", used: false },
  { index: 3, url: "https://example.net/c", title: "Bron C", origin: "scholar", used: false },
];

function fakeNumbered(): NumberedSource[] {
  return FAKE_SOURCES.map((s) => ({
    index: s.index,
    title: s.title,
    url: s.url,
    content: `Vaste inhoud voor ${s.title} t.b.v. de synthese-fase.`,
  }));
}

/**
 * Vaste markdown met inline `[1] [2]`-citaties + een `## Sources`-sectie.
 * Bron [3] wordt bewust NIET geciteerd zodat we de `used`-vlag-discriminatie
 * kunnen verifiëren.
 */
const FAKE_MARKDOWN = [
  "# Onderzoeksrapport",
  "",
  "De markt groeit gestaag [1]. Experts wijzen op een verschuiving [2].",
  "Beide bronnen onderbouwen de trend [1].",
  "",
  "## Sources",
  "[1] Bron A — https://example.com/a",
  "[2] Bron B — https://example.org/b",
].join("\n");

// ─── Fake fase-implementaties (matchen de echte signatures) ──

const fakePlanFn: DeepResearchDeps["planFn"] = async (): Promise<ResearchPlan> => ({
  subQuestions: ["Wat is X?", "Waarom X?"],
  searchQueries: ["x overview", "x data"],
});

function makeFakeSearchFn(opts?: {
  /** Lever lege sources + grounding-tekst + warning (degradatie-pad). */
  degrade?: boolean;
  /** Roep deze callback aan vóór return (bv. om te aborteren). */
  beforeReturn?: () => void;
}): DeepResearchDeps["searchFn"] {
  return async (input): Promise<SearchOutput> => {
    // Emit dezelfde `source`-events als de echte fase voor event-realisme.
    if (!opts?.degrade) {
      for (const s of FAKE_SOURCES) {
        input.sendEvent({ type: "source", index: s.index, url: s.url, title: s.title, origin: s.origin });
      }
    }
    opts?.beforeReturn?.();
    if (opts?.degrade) {
      return {
        sources: [],
        groundingTexts: [{ query: "x overview", text: "Gegronde samenvatting ".repeat(20) }],
        exaContext: "",
        warnings: ["Exa enrichment skipped: simulated exa/scholar failure"],
      };
    }
    return {
      sources: FAKE_SOURCES,
      groundingTexts: [{ query: "x overview", text: "Gegronde samenvatting." }],
      exaContext: "",
      warnings: [],
    };
  };
}

const fakeReadFn: DeepResearchDeps["readFn"] = async (input): Promise<ReadOutput> => {
  // Met sources: scrape-pad nabootsen. Zonder sources (degradatie): leeg
  // teruggeven zodat de orchestrator via ensureContent() de grounding
  // projecteert op de bronnen.
  if (input.sources.length === 0) {
    return { numbered: [], warnings: [] };
  }
  for (const s of input.sources) {
    input.sendEvent({ type: "source-read", index: s.index, status: "ok" });
  }
  return { numbered: fakeNumbered(), warnings: [] };
};

const fakeVerifyFn: DeepResearchDeps["verifyFn"] = async (input): Promise<VerifyOutput> => {
  input.sendEvent({ type: "verify", claimsChecked: 3, flagged: 0 });
  return { notes: "", claimsChecked: 3, flagged: 0, warnings: [] };
};

const fakeSynthesizeFn: DeepResearchDeps["synthesizeFn"] = async (): Promise<SynthesizeOutput> => ({
  markdown: FAKE_MARKDOWN,
  inputTokens: 0,
  outputTokens: 0,
});

const fakeFinalizeFn: DeepResearchDeps["finalizeFn"] = async (input): Promise<FinalizeOutput> => {
  // Bootst de echte finalize na: markeer `used` op basis van `[n]` + garandeer
  // een `## Sources`-sectie + een geldige categorie.
  const cited = new Set<number>();
  const regex = /\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(input.markdown)) !== null) cited.add(Number(m[1]));
  const sources = input.sources.map((s) => ({ ...s, used: cited.has(s.index) }));
  return {
    markdown: input.markdown,
    suggestedTitle: `Onderzoek: ${input.topic}`,
    suggestedCategory: coerceCategory("Research"),
    suggestedTags: ["x", "markt"],
    summary: "Korte samenvatting van het rapport.",
    keyTakeaways: ["Takeaway 1", "Takeaway 2"],
    sources,
  };
};

const fakeBrandContextFn: DeepResearchDeps["brandContextFn"] = async () => null;

function baseDeps(searchFn?: DeepResearchDeps["searchFn"]): DeepResearchDeps {
  return {
    planFn: fakePlanFn,
    searchFn: searchFn ?? makeFakeSearchFn(),
    readFn: fakeReadFn,
    verifyFn: fakeVerifyFn,
    synthesizeFn: fakeSynthesizeFn,
    finalizeFn: fakeFinalizeFn,
    brandContextFn: fakeBrandContextFn,
  };
}

/** Nooit-aborterende signal-helper. */
function neverAbort(): AbortSignal {
  return new AbortController().signal;
}

function makeInput(over: Partial<RunDeepResearchInput>): RunDeepResearchInput {
  return {
    workspaceId: "ws-smoke",
    topic: "deterministisch smoke-onderwerp",
    answers: [{ id: "q1", question: "Scope?", answer: "Alles" }],
    useBrandContext: false,
    sendEvent: () => {},
    signal: neverAbort(),
    deps: baseDeps(),
    ...over,
  };
}

// ─── Event-volgorde-validatie (assertie 4) ──

const PHASES: ResearchPhase[] = ["plan", "search", "read", "verify", "synthesize", "finalize"];

function assertWellFormedEvents(events: DeepResearchEvent[]): void {
  for (const phase of PHASES) {
    const phaseEvents = events.filter(
      (e): e is Extract<DeepResearchEvent, { type: "phase" }> =>
        e.type === "phase" && e.phase === phase,
    );
    const starts = phaseEvents.filter((e) => e.status === "start").length;
    const dones = phaseEvents.filter((e) => e.status === "done").length;
    ok(`fase "${phase}" heeft precies 1 start`, starts === 1);
    ok(`fase "${phase}" heeft precies 1 done`, dones === 1);
  }
  // Geen `complete`/`error` uit de orchestrator zelf (die komen van de route).
  const terminal = events.filter((e) => e.type === "complete" || e.type === "error");
  ok("orchestrator emit GEEN terminaal complete/error-event (route-verantwoordelijkheid)", terminal.length === 0);
}

// ─── Test-runs ────────────────────────────────────────────────

async function happyPath(): Promise<void> {
  console.log("\n[1] Happy path — volledige run met fakes");
  const events: DeepResearchEvent[] = [];
  const report: DeepResearchReport = await runDeepResearch(
    makeInput({ sendEvent: (e) => events.push(e) }),
  );

  // Assertie 1: stabiele 1-based citatie-indices.
  const indices = report.sources.map((s) => s.index);
  ok("bronnen hebben 1-based opeenvolgende indices [1,2,3]", JSON.stringify(indices) === "[1,2,3]");
  ok("eerste index is exact 1 (1-based)", report.sources[0]?.index === 1);

  // Assertie 2: [n] → used + ## Sources-sectie.
  const byIndex = new Map(report.sources.map((s) => [s.index, s]));
  ok("bron [1] (geciteerd) → used = true", byIndex.get(1)?.used === true);
  ok("bron [2] (geciteerd) → used = true", byIndex.get(2)?.used === true);
  ok("bron [3] (niet geciteerd) → used = false", byIndex.get(3)?.used === false);
  ok("markdown bevat een `## Sources`-sectie", /^##\s+Sources\s*$/im.test(report.markdown));

  // Assertie 3: geldige categorie.
  ok(
    `suggestedCategory ∈ RESOURCE_CATEGORIES ("${report.suggestedCategory}")`,
    (RESOURCE_CATEGORIES as readonly string[]).includes(report.suggestedCategory),
  );

  // Assertie 4: welgevormde event-volgorde + één terminaal resultaat (rapport).
  assertWellFormedEvents(events);
  ok("retourwaarde is een welgevormd rapport (terminaal resultaat)", typeof report.markdown === "string" && report.markdown.length > 0);
}

async function abortAfterSearch(): Promise<void> {
  console.log("\n[2] Abort ná de search-fase → geen compleet rapport");
  const controller = new AbortController();
  const events: DeepResearchEvent[] = [];
  // Abort wordt getriggerd binnen searchFn (ná de search-fase, vóór read).
  const searchFn = makeFakeSearchFn({ beforeReturn: () => controller.abort() });

  let threw = false;
  let returned: DeepResearchReport | undefined;
  try {
    returned = await runDeepResearch(
      makeInput({
        signal: controller.signal,
        sendEvent: (e) => events.push(e),
        deps: baseDeps(searchFn),
      }),
    );
  } catch (error) {
    threw = true;
    ok(
      "geworpen fout is een AbortError",
      error instanceof DOMException && error.name === "AbortError",
    );
  }
  ok("runDeepResearch gooit bij abort-vóór-synthese", threw);
  ok("runDeepResearch retourneert GEEN compleet rapport bij abort", returned === undefined);
  // De synthesize-fase mag nooit gestart zijn.
  const synthStarted = events.some(
    (e) => e.type === "phase" && e.phase === "synthesize" && e.status === "start",
  );
  ok("synthese-fase is NIET gestart na abort", synthStarted === false);
}

async function searchDegradation(): Promise<void> {
  console.log("\n[3] Search-degradatie → run completeert via grounding-baseline + warning");
  const events: DeepResearchEvent[] = [];
  const report: DeepResearchReport = await runDeepResearch(
    makeInput({
      sendEvent: (e) => events.push(e),
      deps: baseDeps(makeFakeSearchFn({ degrade: true })),
    }),
  );

  ok("run completeert ondanks lege search-sources", typeof report.markdown === "string" && report.markdown.length > 0);
  ok(
    "report.warnings bevat de gedegradeerde-exa/scholar-warning",
    report.warnings.some((w) => w.toLowerCase().includes("exa") || w.toLowerCase().includes("skipped")),
  );
  ok("report.warnings is niet-leeg na degradatie", report.warnings.length > 0);
  // Grounding-projectie levert alsnog ≥1 bron met geldige 1-based index.
  ok("grounding-baseline levert ≥1 bron", report.sources.length >= 1);
  ok("eerste grounding-bron heeft 1-based index ≥ 1", (report.sources[0]?.index ?? 0) >= 1);
}

async function main(): Promise<void> {
  console.log("Deep Research orchestrator — deterministische smoke-test (fakes, geen API-kosten)");
  await happyPath();
  await abortAfterSearch();
  await searchDegradation();

  console.log(`\nTotal: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
