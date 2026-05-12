// =============================================================
// Plan-and-Solve chain types — sub-sprint #5.B chain-pattern C.
// Per plan §3.0 patroon C (Wang et al. 2023).
//
// Pipeline: PLAN-stap → N × EXECUTE-stap (sequentieel) → ASSEMBLY-stap.
// Sequentieel ipv parallel zodat sectie-N anchor heeft op sectie-N-1
// (narrative-flow + cross-reference consistency).
//
// Cost-impact: 1 plan-call + N execute-calls vs 1 grote call. Bij
// 5-sectie blog-post: ~+10% cost (kleine plan-call goedkoop), ~+10s
// latency (sequential).
// =============================================================

/**
 * Plan-stap output. AI bouwt outline + word-budgets + sectie-doelen.
 * Wordt JSON-schema-gevalideerd voordat execute-stap start.
 */
export interface ContentPlan {
  /** H1-niveau titel — uniek per content-piece, SEO-bewust. */
  title: string;
  /** Optional meta-description voor SEO-content (≤ 160 chars). */
  metaDescription?: string;
  /** Geordende secties; sectie-volgorde = output-volgorde. */
  sections: PlanSection[];
  /** Optioneel: korte FAQ-sectie aan eind (alleen voor blog/pillar-page). */
  faqQuestions?: string[];
  /** Audience-anchor — 1-zin samenvatting wie deze content leest. */
  audienceAnchor: string;
}

export interface PlanSection {
  /** H2-niveau heading; sentence-case in NL. */
  heading: string;
  /**
   * Target woordaantal voor deze sectie. Execute-stap krijgt dit als hard
   * budget; mag ±15% afwijken. Sum van wordBudgets ≈ totale wordCount.
   */
  wordBudget: number;
  /**
   * Sectie-doel in 1 zin — wat moet de lezer hier doen / leren / voelen?
   * Anchor voor execute-stap om de focus te behouden.
   */
  goal: string;
  /**
   * 2-4 bullet-punten die de inhoud van deze sectie outlines. Execute-stap
   * mag uitbreiden maar moet alle keyPoints raken.
   */
  keyPoints: string[];
}

/**
 * Execute-stap output per sectie. Wordt cumulatief opgebouwd en in
 * assembly-stap samengevoegd.
 */
export interface ExecutedSection {
  /** Heading uit plan, doorgegeven voor consistency. */
  heading: string;
  /** Markdown-content voor deze sectie (zonder H2-heading prefix). */
  content: string;
  /** Daadwerkelijke woordaantal — voor monitoring vs wordBudget. */
  actualWordCount: number;
}

/**
 * Volledige pipeline-output. assembledContent is de gefinaliseerde
 * markdown die naar variant.content gaat.
 */
export interface PlanAndSolveOutput {
  plan: ContentPlan;
  sections: ExecutedSection[];
  /** Markdown: H1 + intro (eerste sectie) + H2 + sectie-content per sectie. */
  assembledContent: string;
  /** Per-stage cost-tracking voor telemetry. */
  metrics: {
    planLatencyMs: number;
    executeLatencyMs: number;
    totalSections: number;
    totalWordCount: number;
  };
}

/**
 * Event-stream voor SSE-orchestrator. Verstuurd door runPlanAndSolveStream
 * zodat UI per-stage progress kan tonen.
 */
export type PlanAndSolveEvent =
  | { event: 'plan_started' }
  | { event: 'plan_complete'; data: ContentPlan }
  | { event: 'section_started'; data: { index: number; heading: string } }
  | { event: 'section_complete'; data: ExecutedSection }
  | { event: 'assembly_complete'; data: PlanAndSolveOutput }
  | { event: 'error'; data: { stage: 'plan' | 'execute' | 'assembly'; message: string } };

/**
 * Brief-input voor plan-stage. Subset van full canvas-stack —
 * Plan-and-Solve hoeft niet de hele context te kennen, alleen het
 * relevante voor outline-besluiten.
 */
export interface PlanAndSolveBrief {
  brandName: string;
  contentLanguage: string;
  contentType: string;
  objective: string;
  keyMessage: string;
  toneDirection: string;
  callToAction: string;
  audienceDescription: string; // 1-2 zin uit persona of bril
  /** SEO keyword voor types die het nodig hebben. */
  seoKeyword?: string;
  /** Optionele content-type-specifieke fields. */
  typeSpecificInputs?: Record<string, string | string[]>;
}
