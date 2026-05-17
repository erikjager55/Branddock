// =============================================================
// Brandclaw — ContentFidelityScore source-accessor (ADR 2026-05-08).
//
// Queryt ContentFidelityScore-rows + bijbehorende BrandReviewFinding-counts
// per severity binnen een time-window. Materializeert per score een
// DataSnapshot row zodat past Strategy Analyst observations point-in-time
// reproduceerbaar blijven nadat live findings worden gedismist of fixed.
//
// Payload-shape: { scoreId, contentVersionId, compositeScore, thresholdMet,
//   pillarScores, judgeIdentifier, ruleViolationCount, findingCountsBySeverity,
//   findingCountsByCategory, scoredAt }
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

const SOURCE_TYPE: BrandclawSourceType = "content_fidelity";

interface ContentFidelitySnapshotPayload {
  scoreId: string;
  contentVersionId: string;
  compositeScore: number;
  thresholdMet: boolean;
  /** Pillar-scores zoals opgeslagen: { strategic, audience, execution } */
  pillarScores: unknown;
  judgeIdentifier: string;
  ruleViolationCount: number;
  findingCountsBySeverity: Record<string, number>;
  findingCountsByCategory: Record<string, number>;
  scoredAt: string;
}

class ContentFidelitySource implements DataSourceAccessor<ContentFidelitySnapshotPayload> {
  readonly sourceType: BrandclawSourceType = SOURCE_TYPE;

  async query(
    input: DataSourceQueryInput,
  ): Promise<DataSourceQueryResult<ContentFidelitySnapshotPayload>> {
    const { workspaceId, window } = input;

    const scores = await prisma.contentFidelityScore.findMany({
      where: {
        workspaceId,
        ...window.toWhere("scoredAt"),
      },
      select: {
        id: true,
        contentVersionId: true,
        compositeScore: true,
        thresholdMet: true,
        pillarScores: true,
        judgeIdentifier: true,
        ruleViolations: true,
        scoredAt: true,
        findings: {
          select: { severity: true, category: true },
        },
      },
      orderBy: { scoredAt: "desc" },
      take: 50,
    });

    const rows: ContentFidelitySnapshotPayload[] = scores.map((s) => {
      const findingCountsBySeverity: Record<string, number> = {};
      const findingCountsByCategory: Record<string, number> = {};
      for (const f of s.findings) {
        findingCountsBySeverity[f.severity] =
          (findingCountsBySeverity[f.severity] ?? 0) + 1;
        findingCountsByCategory[f.category] =
          (findingCountsByCategory[f.category] ?? 0) + 1;
      }
      const ruleViolationCount = Array.isArray(s.ruleViolations)
        ? s.ruleViolations.length
        : 0;
      return {
        scoreId: s.id,
        contentVersionId: s.contentVersionId,
        compositeScore: s.compositeScore,
        thresholdMet: s.thresholdMet,
        pillarScores: s.pillarScores,
        judgeIdentifier: s.judgeIdentifier,
        ruleViolationCount,
        findingCountsBySeverity,
        findingCountsByCategory,
        scoredAt: s.scoredAt.toISOString(),
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
              sourceId: row.scoreId,
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

getRegistryForTests().register(new ContentFidelitySource());

export { ContentFidelitySource };
