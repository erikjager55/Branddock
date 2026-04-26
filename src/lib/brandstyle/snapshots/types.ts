// =============================================================
// Snapshot type definitions
//
// Centrale plek voor TS-types die client + server delen rond het
// BrandstyleSnapshot model. De Prisma-type zelf is intern; deze
// shapes zijn wat de API en UI consumeren.
// =============================================================

export type SnapshotTriggerSource =
  | 'analyze-url'
  | 'analyze-pdf'
  | 'manual'
  | 'cron';

export interface SnapshotSummary {
  id: string;
  capturedAt: string;
  tokensHash: string;
  triggerSource: SnapshotTriggerSource;
  triggeredBy: { id: string; name: string | null } | null;
  notes: string | null;
  /** Eén-zin samenvatting van het verschil met de vorige snapshot,
   *  pre-computed in de list endpoint zodat de timeline UI niet per
   *  rij opnieuw een diff hoeft te draaien. */
  changeSummary: string | null;
  changeCount: number;
}

export interface SnapshotDetail extends SnapshotSummary {
  scrapeHash: string | null;
  screenshotUrl: string | null;
  tokensJson: unknown;
  scrapedJson: unknown | null;
  semanticTokens: unknown | null;
}
