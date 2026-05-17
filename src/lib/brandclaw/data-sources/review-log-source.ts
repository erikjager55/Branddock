// =============================================================
// Brandclaw — ContentReviewLog source-accessor (ADR 2026-05-08).
//
// Queryt ContentReviewLog-rows (uit Δ-1 paste-in review-flow) binnen een
// time-window. Materializeert per review een DataSnapshot row met
// source-mix, composite + pillar-scores, duration en finding-counts —
// de Strategy Analyst gebruikt dit voor 'review_pattern' dimensie
// (e.g. trend in source-mix over tijd, drift in compositeScore).
//
// Payload-shape: { logId, sourceType, language, compositeScore,
//   pillarScores, durationMs, findingCount, findingCountsBySeverity,
//   findingCountsByCategory, createdAt }
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

const SOURCE_TYPE: BrandclawSourceType = "review_log";

interface ReviewLogSnapshotPayload {
  logId: string;
  sourceType: string;
  language: string | null;
  compositeScore: number;
  pillarScores: unknown;
  durationMs: number;
  findingCount: number;
  findingCountsBySeverity: Record<string, number>;
  findingCountsByCategory: Record<string, number>;
  createdAt: string;
}

class ReviewLogSource implements DataSourceAccessor<ReviewLogSnapshotPayload> {
  readonly sourceType: BrandclawSourceType = SOURCE_TYPE;

  async query(
    input: DataSourceQueryInput,
  ): Promise<DataSourceQueryResult<ReviewLogSnapshotPayload>> {
    const { workspaceId, window } = input;

    const logs = await prisma.contentReviewLog.findMany({
      where: {
        workspaceId,
        ...window.toWhere("createdAt"),
      },
      select: {
        id: true,
        sourceType: true,
        language: true,
        compositeScore: true,
        pillarScoresJson: true,
        durationMs: true,
        createdAt: true,
        findings: {
          select: { severity: true, category: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const rows: ReviewLogSnapshotPayload[] = logs.map((l) => {
      const findingCountsBySeverity: Record<string, number> = {};
      const findingCountsByCategory: Record<string, number> = {};
      for (const f of l.findings) {
        findingCountsBySeverity[f.severity] =
          (findingCountsBySeverity[f.severity] ?? 0) + 1;
        findingCountsByCategory[f.category] =
          (findingCountsByCategory[f.category] ?? 0) + 1;
      }
      return {
        logId: l.id,
        sourceType: l.sourceType,
        language: l.language,
        compositeScore: l.compositeScore,
        pillarScores: l.pillarScoresJson,
        durationMs: l.durationMs,
        findingCount: l.findings.length,
        findingCountsBySeverity,
        findingCountsByCategory,
        createdAt: l.createdAt.toISOString(),
      };
    });

    const snapshotedAt = new Date();
    const snapshotIds: string[] = [];
    if (rows.length > 0) {
      const snapshots = await prisma.$transaction(
        rows.map((row) =>
          prisma.dataSnapshot.create({
            data: {
              workspaceId,
              sourceType: SOURCE_TYPE,
              sourceId: row.logId,
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

getRegistryForTests().register(new ReviewLogSource());

export { ReviewLogSource };
