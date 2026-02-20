// =============================================================
// AI Usage Tracker — log and aggregate AI token usage
//
// Records individual AI calls and provides aggregation queries
// for billing periods. When billing is disabled, tracking still
// works (for analytics) but is never enforced.
// =============================================================

import { prisma } from '@/lib/prisma';

// ─── Track a single AI usage event ──────────────────────────

export interface TrackAiUsageParams {
  workspaceId: string;
  userId: string;
  tokens: number;
  model: string;
  feature: string; // e.g. 'brand-analysis', 'content-studio', 'alignment-scan'
  cost?: number;
}

/**
 * Records an AI usage event. Called after every AI completion call.
 */
export async function trackAiUsage(params: TrackAiUsageParams): Promise<void> {
  await prisma.aiUsageRecord.create({
    data: {
      workspaceId: params.workspaceId,
      userId: params.userId,
      tokens: params.tokens,
      model: params.model,
      feature: params.feature,
      cost: params.cost ?? null,
    },
  });
}

// ─── Get usage this month ───────────────────────────────────

export interface MonthlyUsage {
  totalTokens: number;
  totalCost: number;
  callCount: number;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Returns aggregated AI usage for the current billing month.
 * Billing month = 1st of current month to now.
 */
export async function getUsageThisMonth(workspaceId: string): Promise<MonthlyUsage> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [aggregate, count] = await Promise.all([
    prisma.aiUsageRecord.aggregate({
      where: {
        workspaceId,
        createdAt: { gte: periodStart, lte: now },
      },
      _sum: { tokens: true, cost: true },
    }),
    prisma.aiUsageRecord.count({
      where: {
        workspaceId,
        createdAt: { gte: periodStart, lte: now },
      },
    }),
  ]);

  return {
    totalTokens: aggregate._sum.tokens ?? 0,
    totalCost: aggregate._sum.cost ?? 0,
    callCount: count,
    periodStart,
    periodEnd,
  };
}

// ─── Get usage by feature ───────────────────────────────────

export interface FeatureUsage {
  feature: string;
  totalTokens: number;
  callCount: number;
}

/**
 * Returns AI usage broken down by feature for the current month.
 */
export async function getUsageByFeature(workspaceId: string): Promise<FeatureUsage[]> {
  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);

  const results = await prisma.aiUsageRecord.groupBy({
    by: ['feature'],
    where: {
      workspaceId,
      createdAt: { gte: periodStart },
    },
    _sum: { tokens: true },
    _count: true,
  });

  return results.map((r) => ({
    feature: r.feature,
    totalTokens: r._sum.tokens ?? 0,
    callCount: r._count,
  }));
}

// ─── Get usage history (last N months) ──────────────────────

export interface MonthlyUsageHistory {
  month: string; // YYYY-MM
  totalTokens: number;
  totalCost: number;
  callCount: number;
}

/**
 * Returns monthly usage history for the last `months` months.
 */
export async function getUsageHistory(
  workspaceId: string,
  months: number = 6,
): Promise<MonthlyUsageHistory[]> {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const records = await prisma.aiUsageRecord.findMany({
    where: {
      workspaceId,
      createdAt: { gte: startDate },
    },
    select: {
      tokens: true,
      cost: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by month
  const byMonth = new Map<string, { tokens: number; cost: number; count: number }>();

  // Initialize all months
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(key, { tokens: 0, cost: 0, count: 0 });
  }

  // Aggregate records
  for (const record of records) {
    const d = record.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const entry = byMonth.get(key);
    if (entry) {
      entry.tokens += record.tokens;
      entry.cost += record.cost ?? 0;
      entry.count += 1;
    }
  }

  return Array.from(byMonth.entries()).map(([month, data]) => ({
    month,
    totalTokens: data.tokens,
    totalCost: data.cost,
    callCount: data.count,
  }));
}

// ─── Reset monthly usage (admin/testing) ────────────────────

/**
 * Deletes all AI usage records for a workspace in the current month.
 * Intended for testing/admin purposes only.
 */
export async function resetMonthlyUsage(workspaceId: string): Promise<number> {
  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);

  const result = await prisma.aiUsageRecord.deleteMany({
    where: {
      workspaceId,
      createdAt: { gte: periodStart },
    },
  });

  return result.count;
}
