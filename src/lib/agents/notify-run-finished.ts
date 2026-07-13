// =============================================================
// Agent-run-notificaties (agents-scheduling, slice 3) — in-app +
// e-mail bij COMPLETED / FAILED / AWAITING_CONFIRMATION.
//
// Patroon: notify-major-events.ts — fail-soft (throwt nooit; een
// notificatie-uitval mag een al-geslaagde run nooit breken). De
// callers AWAITEN deze helper: op het cron-pad kan een invocation
// direct na de laatste write eindigen en zou fire-and-forget de
// notificatie droppen. Ontvanger = de run-owner (acting identity);
// een gezette maar niet-(meer-)lid owner → skip, geen broadcast.
//
// NotificationPreference: alléén `emailEnabled` wordt gerespecteerd
// (ontbrekende rij = default true, conform het schema-default). De
// `matrix`-keys zijn aantoonbaar inconsistent tussen de settings-API
// (aiAnalysis, …) en de settings-UI (research_completed, …) en
// quiet-hours wordt door geen enkel send-pad gehandhaafd — bewust
// buiten scope tot dat model geharmoniseerd is.
// =============================================================

import type { NotificationType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { trySendTransactional } from '@/lib/email/transactional';
import { getWorkspaceUsers } from '@/lib/workspace/workspace-users';
import { getAgentDefinition } from '@/lib/agents/registry';

export interface AgentRunNotificationInput {
  workspaceId: string;
  runId: string;
  agentId: string;
  status: 'COMPLETED' | 'FAILED' | 'AWAITING_CONFIRMATION';
  error: string | null;
  artifactCount: number;
  /** Acting identity van de run — de primaire ontvanger. */
  userId: string | null;
  /** 'manual' | 'scheduled' | 'event_driven' — e-mail alleen voor scheduled
   * runs (bij een manual run kijkt de user al mee; in-app krijgt hij wél). */
  triggerType: string;
}

const TYPE_BY_STATUS: Record<AgentRunNotificationInput['status'], NotificationType> = {
  COMPLETED: 'AGENT_RUN_COMPLETED',
  FAILED: 'AGENT_RUN_FAILED',
  AWAITING_CONFIRMATION: 'AGENT_RUN_AWAITING_CONFIRMATION',
};

/** In-app + (preference-gated) e-mail bij een afgeronde agent-run. */
export async function notifyAgentRunFinished(input: AgentRunNotificationInput): Promise<void> {
  try {
    const def = getAgentDefinition(input.agentId);
    const personaLabel = def ? `${def.persona.name} (${def.persona.role})` : input.agentId;

    const title =
      input.status === 'COMPLETED'
        ? `${personaLabel} finished a task`
        : input.status === 'AWAITING_CONFIRMATION'
          ? `${personaLabel} needs your approval`
          : `${personaLabel} run failed`;
    const description =
      input.status === 'COMPLETED'
        ? `${input.artifactCount} result${input.artifactCount === 1 ? '' : 's'} in the Results Inbox.`
        : input.status === 'AWAITING_CONFIRMATION'
          ? 'A proposal is waiting for your review in the Results Inbox.'
          : (input.error ?? 'The run failed without an error message.').slice(0, 200);

    const allUsers = await getWorkspaceUsers(input.workspaceId);
    // Run-owner only — een manual run van user A mag de rest van de
    // workspace niet spammen. Een gezette maar niet-(meer-)lid owner
    // betekent skippen, níet broadcasten (review-W 2026-07-13); alleen
    // een onbekende owner (userId null) valt terug op de hele workspace.
    const recipients = input.userId
      ? allUsers.filter((u) => u.id === input.userId)
      : allUsers;
    if (recipients.length === 0) {
      console.warn('[notifyAgentRunFinished] geen ontvangers — overgeslagen', {
        workspaceId: input.workspaceId,
        runId: input.runId,
        ownerSet: !!input.userId,
      });
      return;
    }

    await prisma.notification.createMany({
      data: recipients.map((u) => ({
        type: TYPE_BY_STATUS[input.status],
        category: 'SYSTEM' as const,
        title,
        description,
        actionUrl: `agents-inbox?run=${input.runId}`,
        workspaceId: input.workspaceId,
        userId: u.id,
      })),
    });
    invalidateCache(cacheKeys.prefixes.notifications(input.workspaceId));

    // E-mail alleen voor scheduled runs (headless — de user kijkt niet mee).
    if (input.triggerType !== 'scheduled') return;

    // Per-user gegate op NotificationPreference.emailEnabled
    // (geen rij = default true). trySendTransactional no-opt in dev.
    const prefs = await prisma.notificationPreference.findMany({
      where: { userId: { in: recipients.map((u) => u.id) } },
      select: { userId: true, emailEnabled: true },
    });
    const emailDisabled = new Set(prefs.filter((p) => !p.emailEnabled).map((p) => p.userId));
    const base = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
    const inboxUrl = `${base}/?section=agents-inbox&run=${encodeURIComponent(input.runId)}`;

    await Promise.all(
      recipients
        .filter((u) => u.email && !emailDisabled.has(u.id))
        .map((u) =>
          trySendTransactional({
            to: u.email,
            subject: title,
            html: `<p>${escapeHtml(description)}</p><p><a href="${inboxUrl}">Open the Results Inbox</a></p>`,
            text: `${description}\nOpen the Results Inbox: ${inboxUrl}`,
            tags: { type: 'agent-run-finished' },
          }),
        ),
    );
  } catch (error) {
    console.warn('[notifyAgentRunFinished] failed:', error);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
