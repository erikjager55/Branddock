/**
 * Deep Research-orchestrator.
 *
 * Voert de 6-fasen-pipeline uit (plan → search → read → verify → synthesize →
 * finalize) en streamt voortgang via `sendEvent`. Resilient zoals het Trend
 * Radar-patroon: elke fase heeft try/catch → degradeer + push naar `warnings`;
 * alleen wanneer er 0 bronnen overblijven is het fataal. Het abort-signaal
 * wordt aan het begin van elke fase (en in de scrape-loops) gecontroleerd →
 * gooit een AbortError die de route stil afhandelt. Een interne deadline
 * (`config.deadlineMs`) breekt af voordat de route-`maxDuration` verstrijkt.
 *
 * `deps` maakt elke fase injecteerbaar zodat de smoke-test fakes kan gebruiken
 * zonder echte API-kosten; default = de echte fase-implementaties.
 */

import {
  DEFAULT_DEEP_RESEARCH_CONFIG,
  type ClarifyAnswer,
  type DeepResearchConfig,
  type DeepResearchEvent,
  type DeepResearchReport,
  type ResearchPhase,
  type SourceRef,
} from "./types";
import type { NumberedSource } from "./prompts";
import { getBrandContext } from "@/lib/ai/brand-context";
import { formatBrandContext } from "@/lib/ai/prompt-templates";
import { planResearch, type ResearchPlan } from "./phases/plan";
import { runSearch, type SearchOutput } from "./phases/search";
import { runRead, type ReadOutput } from "./phases/read";
import { runVerify, type VerifyOutput } from "./phases/verify";
import { runSynthesize, type SynthesizeOutput } from "./phases/synthesize";
import { runFinalize, type FinalizeOutput } from "./phases/finalize";

// ─── Injecteerbare dependencies (voor tests) ────────────────

export interface DeepResearchDeps {
  planFn?: typeof planResearch;
  searchFn?: typeof runSearch;
  readFn?: typeof runRead;
  verifyFn?: typeof runVerify;
  synthesizeFn?: typeof runSynthesize;
  finalizeFn?: typeof runFinalize;
  /** Levert het reeds-geformatteerde brand-context-blok (of null). */
  brandContextFn?: (workspaceId: string) => Promise<string | null>;
}

interface ResolvedDeps {
  planFn: typeof planResearch;
  searchFn: typeof runSearch;
  readFn: typeof runRead;
  verifyFn: typeof runVerify;
  synthesizeFn: typeof runSynthesize;
  finalizeFn: typeof runFinalize;
  brandContextFn: (workspaceId: string) => Promise<string | null>;
}

async function defaultBrandContext(workspaceId: string): Promise<string | null> {
  try {
    return formatBrandContext(await getBrandContext(workspaceId));
  } catch {
    return null;
  }
}

function resolveDeps(deps?: DeepResearchDeps): ResolvedDeps {
  return {
    planFn: deps?.planFn ?? planResearch,
    searchFn: deps?.searchFn ?? runSearch,
    readFn: deps?.readFn ?? runRead,
    verifyFn: deps?.verifyFn ?? runVerify,
    synthesizeFn: deps?.synthesizeFn ?? runSynthesize,
    finalizeFn: deps?.finalizeFn ?? runFinalize,
    brandContextFn: deps?.brandContextFn ?? defaultBrandContext,
  };
}

// ─── Public API ─────────────────────────────────────────────

export interface RunDeepResearchInput {
  workspaceId: string;
  topic: string;
  answers: ClarifyAnswer[];
  useBrandContext: boolean;
  sendEvent: (e: DeepResearchEvent) => void;
  signal: AbortSignal;
  config?: Partial<DeepResearchConfig>;
  deps?: DeepResearchDeps;
}

const PHASE_LABELS: Record<ResearchPhase, string> = {
  plan: "Planning the research",
  search: "Searching sources",
  read: "Reading sources",
  verify: "Verifying claims",
  synthesize: "Synthesizing the report",
  finalize: "Finalizing",
};

/** Gooit een AbortError als het signaal afgebroken of de deadline verstreken is. */
function checkAborted(signal: AbortSignal, deadlineAt: number): void {
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  if (Date.now() > deadlineAt) {
    throw new DOMException("Deadline exceeded", "AbortError");
  }
}

/**
 * Voert de volledige deep-research-run uit en retourneert het eindrapport.
 */
export async function runDeepResearch(
  input: RunDeepResearchInput,
): Promise<DeepResearchReport> {
  const config: DeepResearchConfig = {
    ...DEFAULT_DEEP_RESEARCH_CONFIG,
    ...input.config,
  };
  const d = resolveDeps(input.deps);
  const deadlineAt = Date.now() + config.deadlineMs;
  const warnings: string[] = [];
  const { sendEvent, workspaceId, topic, answers } = input;

  // Gecombineerd abort-signaal: breekt af bij client-disconnect (`input.signal`)
  // OF wanneer de interne deadline verstrijkt. Dit signaal gaat naar elke fase
  // én wordt doorgegeven aan de afbreekbare AI-calls (synthese/verify/finalize),
  // zodat een lopende generatie — en de tokenkosten ervan — direct stopt.
  const runController = new AbortController();
  const onParentAbort = () => runController.abort();
  if (input.signal.aborted) {
    runController.abort();
  } else {
    input.signal.addEventListener("abort", onParentAbort, { once: true });
  }
  const deadlineTimer = setTimeout(() => runController.abort(), config.deadlineMs);
  const signal = runController.signal;

  try {
    // Merk-context (optioneel) — niet-fataal.
    let brandBlock: string | undefined;
    if (input.useBrandContext) {
      const block = await d.brandContextFn(workspaceId).catch(() => null);
      if (block) brandBlock = block;
    }

    // ── PLAN ──────────────────────────────────────────────────
    checkAborted(signal, deadlineAt);
    sendEvent({ type: "phase", phase: "plan", label: PHASE_LABELS.plan, status: "start" });
    let plan: ResearchPlan;
    try {
      plan = await d.planFn({
        workspaceId,
        topic,
        answers,
        maxQueries: config.maxSearchQueries,
        brandContext: brandBlock,
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw abortError();
      warnings.push(degradeMsg("plan", error));
      plan = { subQuestions: [], searchQueries: [topic] };
    }
    sendEvent({ type: "plan", subQuestions: plan.subQuestions });
    sendEvent({ type: "phase", phase: "plan", label: PHASE_LABELS.plan, status: "done" });

    // ── SEARCH ────────────────────────────────────────────────
    checkAborted(signal, deadlineAt);
    sendEvent({ type: "phase", phase: "search", label: PHASE_LABELS.search, status: "start" });
    let search: SearchOutput;
    try {
      search = await d.searchFn({
        queries: plan.searchQueries.length > 0 ? plan.searchQueries : [topic],
        maxSources: config.maxSourcesToScrape,
        sendEvent,
        signal,
      });
      warnings.push(...search.warnings);
    } catch (error) {
      if (isAbort(error) || signal.aborted) throw abortError();
      warnings.push(degradeMsg("search", error));
      search = { sources: [], groundingTexts: [], exaContext: "", warnings: [] };
    }
    sendEvent({ type: "phase", phase: "search", label: PHASE_LABELS.search, status: "done" });

    if (search.sources.length === 0 && search.groundingTexts.length === 0) {
      throw new Error("No sources found across all search queries");
    }

    // ── READ ──────────────────────────────────────────────────
    checkAborted(signal, deadlineAt);
    sendEvent({ type: "phase", phase: "read", label: PHASE_LABELS.read, status: "start" });
    let read: ReadOutput;
    try {
      read = await d.readFn({
        sources: search.sources,
        groundingTexts: search.groundingTexts,
        maxSourcesToScrape: config.maxSourcesToScrape,
        sendEvent,
        signal,
      });
      warnings.push(...read.warnings);
    } catch (error) {
      if (isAbort(error) || signal.aborted) throw abortError();
      warnings.push(degradeMsg("read", error));
      read = { numbered: [], warnings: [] };
    }
    sendEvent({ type: "phase", phase: "read", label: PHASE_LABELS.read, status: "done" });

    const numbered = ensureContent(read.numbered, search);
    if (numbered.length === 0) {
      throw new Error("No source content could be read for synthesis");
    }

    // ── VERIFY ────────────────────────────────────────────────
    checkAborted(signal, deadlineAt);
    let verify: VerifyOutput = { notes: "", claimsChecked: 0, flagged: 0, warnings: [] };
    if (config.enableVerify) {
      sendEvent({ type: "phase", phase: "verify", label: PHASE_LABELS.verify, status: "start" });
      try {
        verify = await d.verifyFn({ workspaceId, topic, sources: numbered, sendEvent, signal });
        warnings.push(...verify.warnings);
      } catch (error) {
        if (isAbort(error) || signal.aborted) throw abortError();
        warnings.push(degradeMsg("verify", error));
      }
      sendEvent({ type: "phase", phase: "verify", label: PHASE_LABELS.verify, status: "done" });
    }

    // ── SYNTHESIZE ────────────────────────────────────────────
    checkAborted(signal, deadlineAt);
    sendEvent({ type: "phase", phase: "synthesize", label: PHASE_LABELS.synthesize, status: "start" });
    let synth: SynthesizeOutput;
    try {
      synth = await d.synthesizeFn({
        workspaceId,
        topic,
        answers,
        sources: numbered,
        brandContext: brandBlock,
        exaContext: search.exaContext,
        verificationNotes: verify.notes,
        signal,
      });
    } catch (error) {
      if (isAbort(error) || signal.aborted) throw abortError();
      // Synthese is de kern-deliverable — zonder rapport is de run mislukt.
      throw error instanceof Error ? error : new Error("Synthesis failed");
    }
    sendEvent({ type: "phase", phase: "synthesize", label: PHASE_LABELS.synthesize, status: "done" });

    // ── FINALIZE ──────────────────────────────────────────────
    checkAborted(signal, deadlineAt);
    sendEvent({ type: "phase", phase: "finalize", label: PHASE_LABELS.finalize, status: "start" });
    const refsForFinalize: SourceRef[] = numbered.map((n) => toSourceRef(n, search.sources));
    let finalized: FinalizeOutput;
    try {
      finalized = await d.finalizeFn({
        workspaceId,
        topic,
        markdown: synth.markdown,
        sources: refsForFinalize,
        signal,
      });
    } catch (error) {
      if (isAbort(error) || signal.aborted) throw abortError();
      warnings.push(degradeMsg("finalize", error));
      finalized = fallbackFinalize(topic, synth.markdown, refsForFinalize);
    }
    sendEvent({ type: "phase", phase: "finalize", label: PHASE_LABELS.finalize, status: "done" });

    return {
      markdown: finalized.markdown,
      suggestedTitle: finalized.suggestedTitle,
      suggestedCategory: finalized.suggestedCategory,
      suggestedTags: finalized.suggestedTags,
      summary: finalized.summary,
      keyTakeaways: finalized.keyTakeaways,
      sources: finalized.sources,
      warnings,
    };
  } finally {
    clearTimeout(deadlineTimer);
    input.signal.removeEventListener("abort", onParentAbort);
  }
}

// ─── Helpers ────────────────────────────────────────────────

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

function isAbort(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  // De Anthropic-SDK gooit `APIUserAbortError` zodra het meegegeven signaal
  // afbreekt; normaliseer elke abort-genaamde fout naar een abort.
  return error instanceof Error && /abort/i.test(error.name);
}

function degradeMsg(phase: ResearchPhase, error: unknown): string {
  return `${phase} degraded: ${error instanceof Error ? error.message : "unknown error"}`;
}

/**
 * Wanneer read 0 inhoud opleverde maar er wél grounding-tekst is, projecteer
 * de grounding-samenvattingen op de gevonden bronnen zodat de synthese door
 * kan. Houdt de stabiele index-mapping intact.
 */
function ensureContent(
  numbered: NumberedSource[],
  search: SearchOutput,
): NumberedSource[] {
  if (numbered.length > 0) return numbered;
  const fallbackText = search.groundingTexts.map((g) => g.text).join("\n\n").trim();
  if (!fallbackText) return [];
  // Eén synthetische samenvattings-bron i.p.v. dezelfde grounding-tekst over
  // meerdere indices dupliceren (dat maakt per-bron-citaties betekenisloos).
  // Lege URL → de Sources-sectie toont alleen de titel, geen nep-link.
  return [
    {
      index: 1,
      title: "Web search summary",
      url: "",
      content: fallbackText.slice(0, 6000),
    },
  ];
}

function toSourceRef(n: NumberedSource, sources: SourceRef[]): SourceRef {
  const match = sources.find((s) => s.index === n.index);
  return (
    match ?? {
      index: n.index,
      url: n.url,
      title: n.title,
      origin: "grounding",
      used: false,
    }
  );
}

function fallbackFinalize(
  topic: string,
  markdown: string,
  sources: SourceRef[],
): FinalizeOutput {
  return {
    markdown,
    suggestedTitle: `Research: ${topic.trim()}`.slice(0, 120),
    suggestedCategory: "Research",
    suggestedTags: [],
    summary: markdown.trim().slice(0, 400),
    keyTakeaways: [],
    sources,
  };
}
