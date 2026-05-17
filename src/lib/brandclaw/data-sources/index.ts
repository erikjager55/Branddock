// =============================================================
// Brandclaw DataSource registry (ADR 2026-05-08).
//
// Per-process singleton waar source-accessors zich registreren. Tools
// (uit brandclaw-tool-orchestrator task) consumeren via getSource() en
// hoeven geen Prisma-imports te bevatten — alle data-access loopt
// via deze laag voor snapshot-discipline.
//
// Auto-registreren: importeer een source-module om de side-effect
// register-call uit te voeren (zie alignment-scan-source.ts onderaan).
// Caller `getDataSourceRegistry()` triggert lazy-import van alle v1
// sources om side-effect registrations te garanderen.
// =============================================================

import type {
  BrandclawSourceType,
  DataSourceAccessor,
} from "./types";

class DataSourceRegistryImpl {
  private accessors = new Map<BrandclawSourceType, DataSourceAccessor<unknown>>();

  /**
   * Register een source-accessor voor een source-type. Overschrijft
   * stille bij dubbele registratie van hetzelfde type — laatste wint.
   * Dit pattern laat tests een accessor mocken zonder global state lekken
   * (registry-reset via `reset()` na elke test).
   */
  register<TRow>(accessor: DataSourceAccessor<TRow>): void {
    this.accessors.set(
      accessor.sourceType,
      accessor as DataSourceAccessor<unknown>,
    );
  }

  /**
   * Lookup een accessor. Throwt wanneer source-type niet geregistreerd
   * is — agent-loop catch'd dit naar een tool-error-result message.
   */
  getSource<TRow = unknown>(
    sourceType: BrandclawSourceType,
  ): DataSourceAccessor<TRow> {
    const accessor = this.accessors.get(sourceType);
    if (!accessor) {
      throw new Error(
        `[brandclaw-data-sources] no accessor registered for source-type '${sourceType}'`,
      );
    }
    return accessor as DataSourceAccessor<TRow>;
  }

  /** Lijst alle geregistreerde source-types — voor diagnostics + agent-prompts. */
  listSourceTypes(): BrandclawSourceType[] {
    return Array.from(this.accessors.keys());
  }

  /** Reset state — alleen voor tests. */
  reset(): void {
    this.accessors.clear();
  }
}

const registry = new DataSourceRegistryImpl();

/**
 * Public accessor. Lazy-importeert alle v1 source-modules zodat hun
 * side-effect register-calls zijn uitgevoerd vóór de eerste lookup.
 * Idempotent: meerdere calls registreren niet dubbel.
 */
let initialized = false;
export async function getDataSourceRegistry(): Promise<DataSourceRegistryImpl> {
  if (!initialized) {
    initialized = true;
    // Importeer v1 sources zodat hun register-side-effects vuren.
    // Aparte sources worden in volgende fases toegevoegd:
    //  - content-fidelity-source (Fase 2)
    //  - review-log-source (Fase 2, hangt aan Δ-1)
    //  - voiceguide-source (Fase 2)
    await import("./alignment-scan-source");
  }
  return registry;
}

/** Test-only entry: directe registry-toegang zonder lazy-init. */
export function getRegistryForTests(): DataSourceRegistryImpl {
  return registry;
}

export type { DataSourceAccessor, DataSourceQueryInput, DataSourceQueryResult, BrandclawSourceType } from "./types";
