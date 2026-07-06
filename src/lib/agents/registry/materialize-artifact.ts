// =============================================================
// Agents registry — accept-materialisatie (integratie-principe
// "domain-first write-through", plan agents-foundation 2026-07-06).
//
// Vrije rapporten (REPORT) en tabellen (TABLE) hebben geen bestaand
// domein-thuis; bij artifact-ACCEPT materialiseren ze naar de
// Knowledge Library als KnowledgeResource. Accept-gated (human-in-
// the-loop, library vervuilt niet), idempotent (resource-id wordt in
// artifact.content teruggeschreven) en fail-soft (materialisatie-fout
// mag de accept nooit laten falen — warn + null).
//
// FINDINGS/LINK/PROPOSAL zijn al domein-zichtbaar → no-op.
//
// Lifecycle-keuzes (v1): dismiss ná accept ARCHIVEERT de gematerialiseerde
// resource (library vervuilt niet); re-accept (dismiss → accept) de-archiveert
// hem weer via de idempotente materialize. De route gate't materialisatie +
// adoptie-event op first-accept (conditionele updateMany) zodat concurrent
// dubbel-accepten geen duplicaat-resources of metric-inflatie geven.
// =============================================================

import type { AgentArtifact } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface MaterializeResult {
  knowledgeResourceId: string;
}


/** Library-categorie per agent — leidend voor domein-secties die agent-
 * analyses tonen (Competitors leest 'competitor-analysis'). */
const AGENT_RESOURCE_CATEGORY: Record<string, string> = {
  "market-analyst": "competitor-analysis",
  "research-analyst": "research",
  "data-analyst": "data-analysis",
  strategist: "strategy",
};

export async function materializeArtifactOnAccept(
  artifact: AgentArtifact,
): Promise<MaterializeResult | null> {
  if (artifact.type !== "REPORT" && artifact.type !== "TABLE") return null;

  try {
    const content = (artifact.content ?? {}) as Record<string, unknown>;
    const existingId =
      typeof content.knowledgeResourceId === "string" ? content.knowledgeResourceId : null;
    if (existingId) {
      // Idempotent: latere accepts maken geen duplicaat. De dearchivering is
      // meteen de existence-check: count 0 = de resource is door de user uit
      // de library verwijderd → strip het stale id en val door naar het
      // create-pad zodat re-accept opnieuw materialiseert.
      const revived = await prisma.knowledgeResource.updateMany({
        where: { id: existingId, workspaceId: artifact.workspaceId },
        data: { isArchived: false },
      });
      if (revived.count > 0) return { knowledgeResourceId: existingId };
      const { knowledgeResourceId: _stale, ...cleanContent } = content;
      void _stale;
      await prisma.agentArtifact.update({
        where: { id: artifact.id },
        data: { content: cleanContent as Prisma.InputJsonValue },
      });
    }

    const markdown =
      artifact.type === "REPORT"
        ? typeof content.markdown === "string" && content.markdown.trim().length > 0
          ? content.markdown
          : null
        : renderTableMarkdown(content);
    if (!markdown) return null;

    // Create + write-back in één transactie: faalt de write-back, dan is er
    // ook geen resource — anders zou een volgende accept een duplicaat maken
    // (de idempotentie leunt op content.knowledgeResourceId). De verse
    // re-read bínnen de transactie verkleint race-vensters met een
    // concurrente accept (duplicaat) of dismiss (materialiseren van een
    // inmiddels-dismissed artefact) tot microseconden.
    let racedExistingId: string | null = null;
    const resource = await prisma.$transaction(async (tx) => {
      // Serialiseer concurrente materialisaties per artefact: onder READ
      // COMMITTED kunnen twee accepts anders beide de re-read hieronder
      // passeren en dubbele resources maken (waarvan één orphan). De
      // advisory lock geldt tot commit/rollback van deze transactie.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${artifact.id}))`;
      const fresh = await tx.agentArtifact.findUnique({
        where: { id: artifact.id },
        select: { acceptedAt: true, content: true },
      });
      if (!fresh || fresh.acceptedAt === null) return null; // inmiddels dismissed/weg
      const freshContent = (fresh.content ?? {}) as Record<string, unknown>;
      if (typeof freshContent.knowledgeResourceId === "string") {
        racedExistingId = freshContent.knowledgeResourceId; // concurrente accept won
        return null;
      }
      // Domein-categorie o.b.v. de producerende agent — zo kunnen module-
      // pagina's (bv. Competitors) hun agent-analyses terugvinden.
      const run = await tx.agentRun.findUnique({
        where: { id: artifact.runId },
        select: { agentId: true },
      });
      const category = AGENT_RESOURCE_CATEGORY[run?.agentId ?? ""] ?? "";
      const created = await tx.knowledgeResource.create({
        data: {
          workspaceId: artifact.workspaceId,
          title: artifact.title,
          description: deriveDescription(markdown),
          type: "article",
          category,
          source: "AGENT",
          content: markdown,
          tags: ["agent"] as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.agentArtifact.update({
        where: { id: artifact.id },
        data: {
          content: { ...freshContent, knowledgeResourceId: created.id } as Prisma.InputJsonValue,
        },
      });
      return created;
    });

    if (resource) return { knowledgeResourceId: resource.id };
    if (racedExistingId) return { knowledgeResourceId: racedExistingId };
    return null;
  } catch (err) {
    console.warn("[agents materialize] failed to materialize artifact to Knowledge Library", {
      artifactId: artifact.id,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * (De)archiveer de eerder gematerialiseerde KnowledgeResource van een
 * artefact. Fail-soft (warn + false) en workspace-gescoped. Returnt true
 * wanneer er daadwerkelijk een resource geraakt is.
 */
export async function setMaterializedResourceArchived(
  artifact: AgentArtifact,
  archived: boolean,
): Promise<boolean> {
  const content = (artifact.content ?? {}) as Record<string, unknown>;
  const resourceId =
    typeof content.knowledgeResourceId === "string" ? content.knowledgeResourceId : null;
  if (!resourceId) return false;
  try {
    const result = await prisma.knowledgeResource.updateMany({
      where: { id: resourceId, workspaceId: artifact.workspaceId },
      data: { isArchived: archived },
    });
    return result.count > 0;
  } catch (err) {
    console.warn("[agents materialize] failed to (de)archive materialized resource", {
      artifactId: artifact.id,
      resourceId,
      archived,
      message: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/** Render een TABLE-artifact ({columns, rows}) naar een markdown-tabel. */
function renderTableMarkdown(content: Record<string, unknown>): string | null {
  const columns = content.columns;
  const rows = content.rows;
  if (!Array.isArray(columns) || columns.length === 0 || !Array.isArray(rows)) return null;

  const cols: Array<{ key: string; label: string }> = [];
  for (const col of columns) {
    if (!col || typeof col !== "object") return null;
    const c = col as Record<string, unknown>;
    if (typeof c.key !== "string" || typeof c.label !== "string") return null;
    cols.push({ key: c.key, label: c.label });
  }

  const escapeCell = (value: unknown): string =>
    String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");

  const header = `| ${cols.map((c) => escapeCell(c.label)).join(" | ")} |`;
  const separator = `| ${cols.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => {
    const r = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
    return `| ${cols.map((c) => escapeCell(r[c.key])).join(" | ")} |`;
  });

  return [header, separator, ...body].join("\n");
}

/** Eerste inhoudelijke regel als description (KnowledgeResource.description is verplicht). */
function deriveDescription(markdown: string): string {
  const firstLine = markdown
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("#") && !line.startsWith("|"));
  const base = firstLine ?? "Agent-generated output accepted into the Knowledge Library.";
  return base.length > 240 ? `${base.slice(0, 237)}...` : base;
}
