// =============================================================
// Data Analyst — TABLE-artefact-contract (tasks/agents-data-analyst.md).
//
// TABLE-artefacten zijn server-owned (motor-wiring security-fix:
// `extractArtifactDrafts` whitelist model-authored types tot REPORT/LINK).
// De query-tools bouwen hun tabel uit échte Prisma-resultaten en
// registreren hem hier via de run-collector — het model kan dus nooit
// tabel-cijfers verzinnen of vervalsen; het krijgt alleen een compacte
// samenvatting terug.
//
// De strikte parser is de Integration-First-pin (Phase -1 gate): de
// content-shape `{columns, rows, summary?}` wordt vóór persistentie
// gevalideerd en is exact de shape die `renderTableMarkdown` in
// materialize-artifact.ts (accept → KnowledgeResource) en de
// TableArtifactView in de inbox verwachten. Een misvormde tabel wordt
// NOOIT als TABLE gepersisteerd: fallback is een REPORT-artefact met
// expliciete "table parse failed"-notitie + de ruwe data (capped).
// =============================================================

import type { BrandclawRunContext } from "@/lib/brandclaw/orchestrator/types";
import { fenceUntrustedContent } from "@/lib/ai/untrusted-fence";
import { recordArtifact } from "../run-collector";

/** Harde rij-cap per tabel/tool-call (acceptatiecriterium: ≤200, in code afgedwongen). */
export const MAX_TABLE_ROWS = 200;

/** Cap op de preview die het model terugkrijgt — grote tabellen jagen anders de token-kosten op. */
const MAX_PREVIEW_CHARS = 8_000;
const MAX_PREVIEW_ROWS = 50;

/** Kolom-types voor type-bewuste rendering in TableArtifactView. */
export type TableColumnType = "text" | "number" | "date";

export interface TableColumn {
  key: string;
  label: string;
  type: TableColumnType;
}

/** Cel-waarden zijn scalars — geneste objecten/arrays zijn per definitie corrupt. */
export type TableCellValue = string | number | boolean | null;

export interface TableContent {
  columns: TableColumn[];
  rows: Record<string, TableCellValue>[];
  /** Korte, feitelijke samenvatting (aggregaten) — geen model-tekst. */
  summary?: string;
  [key: string]: unknown;
}

export type TableParseResult =
  | { ok: true; table: TableContent }
  | { ok: false; reason: string };

const COLUMN_TYPES = new Set<string>(["text", "number", "date"]);

function isScalar(value: unknown): value is TableCellValue {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

/**
 * Strikte validatie van een kandidaat-TABLE-content. Normaliseert rows tot
 * uitsluitend de kolom-keys (ontbrekend → null); wijst af bij: lege/dubbele
 * kolommen, onbekend kolom-type, >MAX_TABLE_ROWS rijen of niet-scalar
 * celwaarden. Reject → nooit een corrupt TABLE-artefact.
 */
export function parseTableContent(value: unknown): TableParseResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "content is not an object" };
  }
  const candidate = value as Record<string, unknown>;

  if (!Array.isArray(candidate.columns) || candidate.columns.length === 0) {
    return { ok: false, reason: "columns must be a non-empty array" };
  }
  const columns: TableColumn[] = [];
  const seenKeys = new Set<string>();
  for (const raw of candidate.columns) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, reason: "each column must be an object" };
    }
    const col = raw as Record<string, unknown>;
    if (typeof col.key !== "string" || col.key.trim().length === 0) {
      return { ok: false, reason: "column key must be a non-empty string" };
    }
    if (typeof col.label !== "string" || col.label.trim().length === 0) {
      return { ok: false, reason: `column '${col.key}' is missing a label` };
    }
    if (typeof col.type !== "string" || !COLUMN_TYPES.has(col.type)) {
      return { ok: false, reason: `column '${col.key}' has an unknown type` };
    }
    if (seenKeys.has(col.key)) {
      return { ok: false, reason: `duplicate column key '${col.key}'` };
    }
    seenKeys.add(col.key);
    columns.push({ key: col.key, label: col.label, type: col.type as TableColumnType });
  }

  if (!Array.isArray(candidate.rows)) {
    return { ok: false, reason: "rows must be an array" };
  }
  if (candidate.rows.length > MAX_TABLE_ROWS) {
    return { ok: false, reason: `row count ${candidate.rows.length} exceeds the ${MAX_TABLE_ROWS}-row cap` };
  }
  const rows: Record<string, TableCellValue>[] = [];
  for (const [index, rawRow] of candidate.rows.entries()) {
    if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) {
      return { ok: false, reason: `row ${index} is not an object` };
    }
    const source = rawRow as Record<string, unknown>;
    const row: Record<string, TableCellValue> = {};
    for (const col of columns) {
      const cell = source[col.key];
      if (cell === undefined) {
        row[col.key] = null;
        continue;
      }
      if (!isScalar(cell)) {
        return { ok: false, reason: `row ${index}, column '${col.key}' has a non-scalar value` };
      }
      row[col.key] = cell;
    }
    rows.push(row);
  }

  const summary =
    typeof candidate.summary === "string" && candidate.summary.trim().length > 0
      ? candidate.summary.slice(0, 1_000)
      : undefined;

  return { ok: true, table: { columns, rows, ...(summary ? { summary } : {}) } };
}

/** Model-facing resultaat van recordTableArtifact — compact, nooit de volle tabel. */
export interface TableToolSummary {
  status: "table_attached" | "table_parse_failed";
  title: string;
  rowCount: number;
  summary?: string;
  /** Gefencede JSON-preview (eerste rijen) — DB-velden zijn user-authored data. */
  preview?: string;
  note: string;
  reason?: string;
}

/**
 * Valideert een door een query-tool gebouwde tabel en registreert hem als
 * server-owned TABLE-artefact op de run. Bij een parse-reject (tool-bug)
 * wordt een REPORT-fallback geregistreerd met "table parse failed"-notitie
 * + de ruwe data — de run blijft COMPLETED, er landt nooit een corrupte
 * TABLE in de inbox. Returnt de compacte samenvatting voor het model.
 */
export function recordTableArtifact(
  ctx: BrandclawRunContext,
  args: { title: string; content: unknown },
): TableToolSummary {
  const parsed = parseTableContent(args.content);

  if (!parsed.ok) {
    let raw: string;
    try {
      raw = JSON.stringify(args.content, null, 2).slice(0, 10_000);
    } catch {
      raw = "(unserializable)";
    }
    recordArtifact(ctx.runId, {
      type: "REPORT",
      title: `${args.title} (table parse failed)`,
      content: {
        markdown: `**Table parse failed** — ${parsed.reason}.\n\nThe query result could not be validated as a table and is preserved below as raw data.\n\n\`\`\`json\n${raw}\n\`\`\``,
      },
    });
    console.warn("[agents data-analyst] table parse failed", {
      runId: ctx.runId,
      title: args.title,
      reason: parsed.reason,
    });
    return {
      status: "table_parse_failed",
      title: args.title,
      rowCount: 0,
      reason: parsed.reason,
      note: "The query result failed table validation and was attached as a raw-data report instead. Tell the user the table could not be rendered; do NOT invent replacement numbers.",
    };
  }

  const { table } = parsed;
  recordArtifact(ctx.runId, {
    type: "TABLE",
    title: args.title,
    content: table as unknown as Record<string, unknown>,
  });

  return {
    status: "table_attached",
    title: args.title,
    rowCount: table.rows.length,
    ...(table.summary ? { summary: table.summary } : {}),
    preview: buildPreview(table),
    note: "This table is attached to the run as a TABLE artifact automatically — do NOT reproduce it as an artifact yourself. Base every number you mention strictly on this data.",
  };
}

/** Compacte, gefencede rij-preview voor het model (cel-waarden zijn user-data). */
function buildPreview(table: TableContent): string {
  let rows = table.rows.slice(0, MAX_PREVIEW_ROWS);
  let json = JSON.stringify({ columns: table.columns.map((c) => c.key), rows });
  while (json.length > MAX_PREVIEW_CHARS && rows.length > 1) {
    rows = rows.slice(0, Math.max(1, Math.floor(rows.length / 2)));
    json = JSON.stringify({ columns: table.columns.map((c) => c.key), rows, previewTruncated: true });
  }
  return fenceUntrustedContent(json, "workspace database query result");
}
