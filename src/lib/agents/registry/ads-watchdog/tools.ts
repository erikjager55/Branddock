// =============================================================
// Ads-watchdog — read-tools (Fase 3, tasks/agent-ads-watchdog.md).
//
// Conventie data-analyst-subdirectory: read-only, harde workspace-scope
// via de FK-keten ConnectedAdAccount.workspaceId, server-owned TABLE via
// recordTableArtifact, content-afgeleide strings (Meta-adnamen) gefenced.
// De signaal-berekening zelf is puur (signals.ts); hier alleen de
// DB-collectie + het weekbudget (PROPOSAL-count laatste 7 dagen).
// =============================================================

import { prisma } from "@/lib/prisma";
import { fenceUntrustedContent } from "@/lib/ai/untrusted-fence";
import type { BrandclawTool } from "@/lib/brandclaw/orchestrator/types";
import { MAX_TABLE_ROWS, recordTableArtifact } from "../data-analyst/table-contract";
import { errorResult } from "../data-analyst/shared";
import {
  AD_FATIGUE_THRESHOLDS,
  WEEKLY_PROPOSAL_CAP,
  evaluateAdSignals,
  remainingWeeklyProposalBudget,
  type AdFatigueSignal,
} from "./signals";

const DAY_MS = 24 * 60 * 60 * 1000;

export const readAdAccountStatusTool: BrandclawTool = {
  definition: {
    name: "read_ad_account_status",
    description:
      "Status of the connected advertising accounts in this workspace: platform, connection status, token expiry and how many ads are being monitored. Use when the user asks about the ad-account connection or when read_ad_signals reports no accounts.",
    input_schema: { type: "object", properties: {} },
  },
  async execute(_input, ctx) {
    try {
      const accounts = await prisma.connectedAdAccount.findMany({
        where: { workspaceId: ctx.workspaceId },
        select: {
          platform: true,
          accountName: true,
          status: true,
          tokenExpiresAt: true,
          _count: { select: { campaigns: { where: { status: "active" } } } },
        },
      });
      return {
        content: {
          accountCount: accounts.length,
          // accountName komt van Meta → content-afgeleid → gefenced.
          accounts: fenceUntrustedContent(
            JSON.stringify(
              accounts.map((a) => ({
                platform: a.platform,
                name: a.accountName,
                status: a.status,
                tokenExpiresAt: a.tokenExpiresAt?.toISOString() ?? null,
                activeAdsMonitored: a._count.campaigns,
              })),
            ),
            "connected ad accounts (names are external data)",
          ),
        },
      };
    } catch (err) {
      return errorResult(err, "READ_AD_ACCOUNT_STATUS_FAILED");
    }
  },
};

export const readAdSignalsTool: BrandclawTool = {
  definition: {
    name: "read_ad_signals",
    description:
      `Creative-fatigue scan over all monitored ads in this workspace (Branddock-published and discovered external ads). Computes three deterministic signals per active ad from the daily metric snapshots: frequency above ${AD_FATIGUE_THRESHOLDS.frequency}, CTR drop of ${AD_FATIGUE_THRESHOLDS.ctrDropPct}%+ (recent vs previous window) and creative age above ${AD_FATIGUE_THRESHOLDS.creativeAgeDays} days. Also returns the remaining weekly refresh-proposal budget (cap ${WEEKLY_PROPOSAL_CAP}/week). The full result is attached as a TABLE artifact automatically. Call this first on every run.`,
    input_schema: { type: "object", properties: {} },
  },
  async execute(_input, ctx) {
    const now = new Date();
    try {
      const rows = await prisma.adCampaign.findMany({
        where: {
          // Alleen actieve accounts: onder een expired/revoked account stopt
          // de sync — oude snapshots als actueel presenteren zou precies het
          // vertrouwensrapport ondermijnen (review W2).
          connectedAccount: { workspaceId: ctx.workspaceId, status: "active" },
          status: "active",
          externalAdId: { not: null },
        },
        select: {
          id: true,
          origin: true,
          externalAdId: true,
          externalName: true,
          creativeCreatedAt: true,
          deliverableId: true,
          metrics: {
            where: { windowStart: { gte: new Date(now.getTime() - 14 * DAY_MS) } },
            orderBy: { windowStart: "asc" },
            select: { windowStart: true, impressions: true, reach: true, ctr: true, spend: true },
          },
        },
      });

      // Weekbudget: PROPOSALs van déze agent in de laatste 7 dagen,
      // workspace-gescoped via de artifact-rij zelf.
      // Alleen échte refresh-voorstellen tellen — Ada maakt via de gedeelde
      // memory-tools ook remember-PROPOSALs; die mogen het refresh-budget
      // niet opeten (review W1).
      const usedThisWeek = await prisma.agentArtifact.count({
        where: {
          workspaceId: ctx.workspaceId,
          type: "PROPOSAL",
          createdAt: { gte: new Date(now.getTime() - 7 * DAY_MS) },
          run: { agentId: "ads-watchdog" },
          content: { path: ["toolName"], equals: "create_deliverable" },
        },
      });
      const budgetRemaining = remainingWeeklyProposalBudget(usedThisWeek);

      const evaluated = rows.map((row) => {
        const signals = evaluateAdSignals(
          {
            externalName: row.externalName,
            creativeCreatedAt: row.creativeCreatedAt,
            snapshots: row.metrics,
          },
          now,
        );
        const spend14d = row.metrics.reduce((sum, m) => sum + (m.spend ?? 0), 0);
        const lastSnapshotAt = row.metrics.at(-1)?.windowStart ?? null;
        return { row, signals, spend14d, lastSnapshotAt };
      });
      // Prioriteit: meeste signalen eerst, daarbinnen hoogste spend
      // (daar doet verval het meeste pijn).
      evaluated.sort((a, b) =>
        b.signals.length - a.signals.length || b.spend14d - a.spend14d,
      );

      const flagged = evaluated.filter((e) => e.signals.length > 0);
      const describe = (s: AdFatigueSignal) =>
        s.type === "frequency"
          ? `frequency ${s.value} > ${s.threshold}`
          : s.type === "ctr-drop"
            ? `CTR -${s.value}% (drempel ${s.threshold}%)`
            : `creative ${s.value}d oud (drempel ${s.threshold}d)`;

      recordTableArtifact(ctx, {
        title: "Ad fatigue scan",
        content: {
          columns: [
            { key: "ad", label: "Ad", type: "text" },
            { key: "origin", label: "Origin", type: "text" },
            { key: "signals", label: "Signals", type: "text" },
            { key: "spend14d", label: "Spend (14d)", type: "number" },
          ],
          rows: evaluated.slice(0, MAX_TABLE_ROWS).map((e) => ({
            ad: e.row.externalName ?? e.row.externalAdId ?? e.row.id,
            origin: e.row.origin,
            signals: e.signals.length === 0 ? "healthy" : e.signals.map(describe).join(" · "),
            spend14d: Math.round(e.spend14d * 100) / 100,
          })),
          summary: `${rows.length} ads monitored, ${flagged.length} with fatigue signals; refresh budget ${budgetRemaining}/${WEEKLY_PROPOSAL_CAP} this week.`,
        },
      });

      return {
        content: {
          adsMonitored: rows.length,
          flaggedCount: flagged.length,
          weeklyProposalBudget: {
            cap: WEEKLY_PROPOSAL_CAP,
            usedThisWeek,
            remaining: budgetRemaining,
          },
          thresholds: AD_FATIGUE_THRESHOLDS,
          // Adnamen zijn content-afgeleid (Meta) → mechanisch gefenced.
          flagged: fenceUntrustedContent(
            JSON.stringify(
              // Top-20 is ruim: het weekbudget is toch <= 3 (review W3).
              flagged.slice(0, 20).map((e) => ({
                adCampaignId: e.row.id,
                name: e.row.externalName,
                origin: e.row.origin,
                deliverableId: e.row.deliverableId,
                creativeCreatedAt: e.row.creativeCreatedAt?.toISOString() ?? null,
                lastSnapshotAt: e.lastSnapshotAt?.toISOString() ?? null,
                spend14d: Math.round(e.spend14d * 100) / 100,
                signals: e.signals,
              })),
            ),
            "fatigued ads (names are external data)",
          ),
        },
      };
    } catch (err) {
      return errorResult(err, "READ_AD_SIGNALS_FAILED");
    }
  },
};

export const adsWatchdogTools: BrandclawTool[] = [readAdSignalsTool, readAdAccountStatusTool];
