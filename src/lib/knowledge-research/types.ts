/**
 * Gedeelde contracten voor de Deep Research-feature van de Knowledge Library.
 *
 * Pure type-module (geen server-only imports) zodat zowel de server-side
 * pipeline (`src/lib/knowledge-research/*`, de API-routes) als de client-hook
 * en -componenten hieruit kunnen importeren zonder de AI-SDK's in de bundle te
 * trekken.
 */

/** Eén verfijningsvraag die vóór de onderzoeksrun aan de gebruiker wordt gesteld. */
export interface ClarifyQuestion {
  id: string;
  question: string;
  /** Optionele hint voor het invoerveld. */
  placeholder?: string;
}

/** Antwoord van de gebruiker op een verfijningsvraag. */
export interface ClarifyAnswer {
  id: string;
  question: string;
  answer: string;
}

/** Herkomst van een gevonden bron. */
export type SourceOrigin = "grounding" | "exa" | "scholar" | "arena";

/** Eén bron die in het onderzoek is meegenomen, met stabiele citatie-index. */
export interface SourceRef {
  /** 1-based, stabiel door de hele run heen (gebruikt als `[index]`-citaat). */
  index: number;
  url: string;
  title: string;
  origin: SourceOrigin;
  /** true zodra `[index]` in de uiteindelijke markdown voorkomt. */
  used: boolean;
}

/** De fasen van de onderzoekspipeline. */
export type ResearchPhase =
  | "plan"
  | "search"
  | "read"
  | "verify"
  | "synthesize"
  | "finalize";

/** Het eindrapport dat de run retourneert (nog NIET opgeslagen in de DB). */
export interface DeepResearchReport {
  /** Volledig geciteerd rapport in markdown, inclusief een `## Sources`-sectie. */
  markdown: string;
  suggestedTitle: string;
  /** Altijd een waarde uit `RESOURCE_CATEGORIES`. */
  suggestedCategory: string;
  suggestedTags: string[];
  summary: string;
  keyTakeaways: string[];
  sources: SourceRef[];
  /** Niet-fatale degradaties (ontbrekende API-key, overgeslagen bron, ...). */
  warnings: string[];
}

/**
 * Discriminated union van events die over de SSE-stream gaan. De client
 * dispatch't op `type`; gebruik GEEN `useAiStream` (die yield't enkel `{text}`).
 */
export type DeepResearchEvent =
  | { type: "phase"; phase: ResearchPhase; label: string; status: "start" | "done" }
  | { type: "plan"; subQuestions: string[] }
  | { type: "source"; index: number; url: string; title: string; origin: SourceOrigin }
  | { type: "source-read"; index: number; status: "ok" | "skipped" }
  | { type: "verify"; claimsChecked: number; flagged: number }
  | { type: "warning"; message: string }
  | { type: "complete"; report: DeepResearchReport }
  | { type: "error"; error: string };

/** Request body voor `POST /api/knowledge-resources/deep-research/clarify`. */
export interface ClarifyRequest {
  topic: string;
}

export interface ClarifyResponse {
  questions: ClarifyQuestion[];
}

/** Request body voor `POST /api/knowledge-resources/deep-research/run` (SSE). */
export interface DeepResearchRunRequest {
  topic: string;
  answers: ClarifyAnswer[];
  useBrandContext?: boolean;
}

/** Configuratie-knoppen (caps/budget) voor de pipeline. */
export interface DeepResearchConfig {
  maxSearchQueries: number;
  maxSourcesToScrape: number;
  enableVerify: boolean;
  /** Harde wallclock-deadline in ms, ruim onder de route-`maxDuration`. */
  deadlineMs: number;
}

export const DEFAULT_DEEP_RESEARCH_CONFIG: DeepResearchConfig = {
  maxSearchQueries: 6,
  maxSourcesToScrape: 12,
  enableVerify: true,
  // 8 min — laat ~2 min marge onder de route-`maxDuration` van 600s voor een
  // niet-afbreekbare in-flight call (scrape/grounding) die net vóór de deadline start.
  deadlineMs: 480_000,
};
