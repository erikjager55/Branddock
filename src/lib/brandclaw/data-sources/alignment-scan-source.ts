// =============================================================
// Brandclaw — AlignmentScan source-accessor (ADR 2026-05-08).
//
// Queryt AlignmentScan-rows + bijbehorende AlignmentIssue-counts per
// severity binnen een time-window. Materializeert per scan een
// DataSnapshot row zodat past Strategy Analyst observations evidence
// kunnen leggen — de live scan-data kan later muteren (status →
// CLOSED, issues dismissed), maar de snapshot blijft point-in-time.
//
// Payload-shape: { scanId, score, totalItems, alignedCount, reviewCount,
//   misalignedCount, status, startedAt, completedAt, issueCountsBySeverity,
//   moduleScores: [{moduleName, score}] }
// =============================================================

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  BrandclawSourceType,
  DataSourceAccessor,
  DataSourceQueryInput,
  DataSourceQueryResult,
} from "./types";
import { getRegistryForTests } from "./index";

const SOURCE_TYPE: BrandclawSourceType = "alignment_scan";

interface AlignmentScanSnapshotPayload {
  scanId: string;
  score: number;
  totalItems: number;
  alignedCount: number;
  reviewCount: number;
  misalignedCount: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
  issueCountsBySeverity: Record<string, number>;
  moduleScores: Array<{ moduleName: string; score: number }>;
}

class AlignmentScanSource implements DataSourceAccessor<AlignmentScanSnapshotPayload> {
  readonly sourceType: BrandclawSourceType = SOURCE_TYPE;

  async query(
    input: DataSourceQueryInput,
  ): Promise<DataSourceQueryResult<AlignmentScanSnapshotPayload>> {
    const { workspaceId, window } = input;

    // Fetch scans + bijbehorende issues + moduleScores in één query.
    // include is intentioneel niet via Prisma include() omdat we de
    // issue-rows niet als objects willen retourneren — alleen counts
    // per severity in de snapshot-payload.
    const scans = await prisma.alignmentScan.findMany({
      where: {
        workspaceId,
        ...window.toWhere("startedAt"),
      },
      select: {
        id: true,
        score: true,
        totalItems: true,
        alignedCount: true,
        reviewCount: true,
        misalignedCount: true,
        status: true,
        startedAt: true,
        completedAt: true,
        moduleScores: { select: { moduleName: true, score: true } },
        issues: { select: { severity: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 50, // cap voor agent-prompt budget; window doet de echte filtering
    });

    const rows: AlignmentScanSnapshotPayload[] = scans.map((s) => {
      const issueCountsBySeverity: Record<string, number> = {};
      for (const issue of s.issues) {
        issueCountsBySeverity[issue.severity] =
          (issueCountsBySeverity[issue.severity] ?? 0) + 1;
      }
      return {
        scanId: s.id,
        score: s.score,
        totalItems: s.totalItems,
        alignedCount: s.alignedCount,
        reviewCount: s.reviewCount,
        misalignedCount: s.misalignedCount,
        status: s.status,
        startedAt: s.startedAt.toISOString(),
        completedAt: s.completedAt?.toISOString() ?? null,
        issueCountsBySeverity,
        moduleScores: s.moduleScores.map((m) => ({
          moduleName: m.moduleName,
          score: m.score,
        })),
      };
    });

    // Materialiseer als immutable DataSnapshot rijen (one per scan).
    // Batched create in transactie — sneller dan N individuele insert
    // calls en ACID-correct als één snapshot faalt.
    const snapshotedAt = new Date();
    const snapshotIds: string[] = [];
    if (rows.length > 0) {
      const snapshots = await prisma.$transaction(
        rows.map((row) =>
          prisma.dataSnapshot.create({
            data: {
              workspaceId,
              sourceType: SOURCE_TYPE,
              sourceId: row.scanId,
              payload: row as unknown as Prisma.InputJsonValue,
              snapshotAt: snapshotedAt,
            },
            select: { id: true },
          }),
        ),
      );
      for (const s of snapshots) snapshotIds.push(s.id);
    }

    return {
      rows,
      snapshotIds,
      meta: {
        sourceType: SOURCE_TYPE,
        windowLabel: window.label,
        rowCount: rows.length,
        snapshotedAt,
      },
    };
  }
}

// Auto-register bij import (side-effect — index.ts vuurt deze via lazy-import).
getRegistryForTests().register(new AlignmentScanSource());

export { AlignmentScanSource };
