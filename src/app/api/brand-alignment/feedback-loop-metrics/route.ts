// =============================================================
// GET /api/brand-alignment/feedback-loop-metrics
// Sub-sprint #6.B dashboard data: auto-iterate success-rate +
// hint-template effectiveness + edit-distance heatmap. Aggregeert
// LearningEvent rijen (content.auto_iterated + content.edited) van de
// afgelopen 30 dagen voor de huidige workspace.
// =============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const FETCH_CAP = 5000;

export interface AutoIterateMetrics {
  totalRuns: number;
  successCount: number;
  exhaustedCount: number;
  avgIterations: number;
  avgScoreImprovement: number;
}

export interface TemplateEffectivenessRow {
  templateId: string;
  appliedCount: number;
  avgScoreImprovement: number;
}

export interface EditDistanceRow {
  componentType: string;
  totalEdits: number;
  significantEdits: number;
  avgDistance: number;
}

export interface FeedbackLoopMetricsResponse {
  window: '30d';
  generatedAt: string;
  autoIterate: AutoIterateMetrics;
  templates: TemplateEffectivenessRow[];
  editDistance: EditDistanceRow[];
}

interface AutoIterateEventData {
  iteration?: number;
  previousScore?: number;
  newScore?: number;
  delta?: number;
  appliedTemplates?: string[];
}

interface EditEventData {
  significantEdit?: boolean;
  componentType?: string;
}

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const since30d = new Date(Date.now() - 30 * ONE_DAY_MS);

    // ── Auto-iterate events ──
    const autoIterateEvents = await prisma.learningEvent.findMany({
      where: {
        workspaceId,
        eventType: 'content.auto_iterated',
        timestamp: { gte: since30d },
      },
      select: { entityId: true, data: true },
      orderBy: { timestamp: 'desc' },
      take: FETCH_CAP,
    });

    // Group iterations per deliverable to derive run-outcomes
    const perDeliverable = new Map<string, AutoIterateEventData[]>();
    for (const evt of autoIterateEvents) {
      const arr = perDeliverable.get(evt.entityId) ?? [];
      arr.push((evt.data as AutoIterateEventData) ?? {});
      perDeliverable.set(evt.entityId, arr);
    }

    let totalRuns = 0;
    let successCount = 0;
    let exhaustedCount = 0;
    let totalIterations = 0;
    let totalImprovement = 0;
    let runsWithImprovement = 0;
    const templateAcc = new Map<string, { count: number; totalDelta: number }>();

    for (const iterations of perDeliverable.values()) {
      if (iterations.length === 0) continue;
      totalRuns++;
      // Iterations zijn DESC sorted; reverse om in volgorde 1..N te krijgen
      const ordered = iterations.slice().reverse();
      const firstPrev = ordered[0].previousScore ?? 0;
      const lastNew = ordered[ordered.length - 1].newScore ?? firstPrev;
      const runImprovement = lastNew - firstPrev;

      // Threshold-success approximation: laatste delta > 0 + final score >= 65
      // (per-type thresholds varieren; 65 is conservatieve heuristic voor dashboard)
      if (lastNew >= 65) successCount++;
      else exhaustedCount++;

      totalIterations += iterations.length;
      if (runImprovement !== 0) {
        totalImprovement += runImprovement;
        runsWithImprovement++;
      }

      for (const iter of ordered) {
        for (const tpl of iter.appliedTemplates ?? []) {
          const entry = templateAcc.get(tpl) ?? { count: 0, totalDelta: 0 };
          entry.count++;
          entry.totalDelta += (iter.newScore ?? 0) - (iter.previousScore ?? 0);
          templateAcc.set(tpl, entry);
        }
      }
    }

    const autoIterate: AutoIterateMetrics = {
      totalRuns,
      successCount,
      exhaustedCount,
      avgIterations: totalRuns > 0 ? Math.round((totalIterations / totalRuns) * 10) / 10 : 0,
      avgScoreImprovement:
        runsWithImprovement > 0 ? Math.round((totalImprovement / runsWithImprovement) * 10) / 10 : 0,
    };

    const templates: TemplateEffectivenessRow[] = Array.from(templateAcc.entries())
      .map(([templateId, agg]) => ({
        templateId,
        appliedCount: agg.count,
        avgScoreImprovement:
          agg.count > 0 ? Math.round((agg.totalDelta / agg.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.appliedCount - a.appliedCount);

    // ── Edit-distance events ──
    const editEvents = await prisma.learningEvent.findMany({
      where: {
        workspaceId,
        eventType: 'content.edited',
        timestamp: { gte: since30d },
      },
      select: { editDistance: true, data: true },
      orderBy: { timestamp: 'desc' },
      take: FETCH_CAP,
    });

    const componentAcc = new Map<
      string,
      { total: number; significant: number; distanceSum: number }
    >();
    for (const evt of editEvents) {
      const data = (evt.data as EditEventData) ?? {};
      const componentType = data.componentType ?? 'unknown';
      const entry = componentAcc.get(componentType) ?? {
        total: 0,
        significant: 0,
        distanceSum: 0,
      };
      entry.total++;
      if (data.significantEdit === true) entry.significant++;
      if (typeof evt.editDistance === 'number') entry.distanceSum += evt.editDistance;
      componentAcc.set(componentType, entry);
    }

    const editDistance: EditDistanceRow[] = Array.from(componentAcc.entries())
      .map(([componentType, agg]) => ({
        componentType,
        totalEdits: agg.total,
        significantEdits: agg.significant,
        avgDistance:
          agg.total > 0 ? Math.round((agg.distanceSum / agg.total) * 1000) / 1000 : 0,
      }))
      .sort((a, b) => b.totalEdits - a.totalEdits);

    const response: FeedbackLoopMetricsResponse = {
      window: '30d',
      generatedAt: new Date().toISOString(),
      autoIterate,
      templates,
      editDistance,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error('[feedback-loop-metrics]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
