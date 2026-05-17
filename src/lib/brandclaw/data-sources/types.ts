// =============================================================
// Brandclaw DataSource registry types (ADR 2026-05-08).
//
// Per ADR-2 zijn er 4 v1 data-bronnen die Strategy Analyst kan queryen
// via tool-use. Elk source-type heeft een accessor die (1) Prisma-fetch
// doet op live data, (2) materialize'd als immutable DataSnapshot, en
// (3) zowel rows als snapshot-ids returnt voor evidence-link.
//
// Registry is per-process singleton (zelfde pattern als Brand Assistant
// tool-registry). Adding nieuwe source = nieuwe accessor + register-call,
// geen schema-migration nodig (DataSnapshot.sourceType is plain TEXT).
// =============================================================

import type { TimeWindow } from "../time-window";

/** Lijst van source-types die Strategy Analyst v1 kent. Uitbreiden via registry. */
export type BrandclawSourceType =
  | "alignment_scan"
  | "content_fidelity"
  | "review_log"
  | "voiceguide";

export interface DataSourceQueryInput {
  workspaceId: string;
  window: TimeWindow;
}

/**
 * Resultaat van een DataSource-query: payload-rows die de agent ziet +
 * snapshot-ids die de agent als evidence kan refereren in observations.
 */
export interface DataSourceQueryResult<TRow = unknown> {
  /** Geserialized rijen (caller mag JSON-stringifyen voor agent-prompt). */
  rows: TRow[];
  /** DataSnapshot.id per row in matching order, of bulk-snapshot-id wanneer 1 snapshot meerdere rows dekt. */
  snapshotIds: string[];
  /** Diagnostische info voor agent + logging. */
  meta: {
    sourceType: BrandclawSourceType;
    windowLabel: string;
    rowCount: number;
    snapshotedAt: Date;
  };
}

/**
 * Een DataSource-accessor weet hoe één source-type te queryen + snapshotten.
 * Implementaties leven in `src/lib/brandclaw/data-sources/*-source.ts` en
 * worden via `DataSourceRegistry.register()` aangemeld.
 */
export interface DataSourceAccessor<TRow = unknown> {
  readonly sourceType: BrandclawSourceType;
  query(input: DataSourceQueryInput): Promise<DataSourceQueryResult<TRow>>;
}
