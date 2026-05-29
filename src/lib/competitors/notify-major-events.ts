// =============================================================
// Competitor MAJOR-event notifications — in-app + email.
//
// Fire-and-forget side-effect: bij detectie van severity=MAJOR
// activities op een refresh worden workspace-users geïnformeerd
// via Notification rows + optionele transactional email.
// Fouten worden niet doorgegeven aan de caller — een uitval mag
// de refresh-write niet blokkeren.
// =============================================================

import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { trySendTransactional } from '@/lib/email/transactional';
import { getWorkspaceUsers } from '@/lib/workspace/workspace-users';
import type { DetectedActivity } from './types';
import { ACTIVITY_TYPE_LABEL } from '@/features/competitors/types/activity';

const MAX_EMAIL_EVENTS = 5;

export interface NotifyMajorEventsParams {
  workspaceId: string;
  competitorId: string;
  competitorName: string;
  activities: DetectedActivity[];
}

/** Verstuurt in-app + email-notificaties voor MAJOR activities. */
export async function notifyMajorEvents(params: NotifyMajorEventsParams): Promise<void> {
  const major = params.activities.filter((a) => a.severity === 'MAJOR');
  if (major.length === 0) return;

  try {
    // Resolve via OrganizationMember (niet de legacy User.workspaceId FK), zodat
    // ook members die enkel via de org aan de workspace hangen worden bereikt.
    const users = await getWorkspaceUsers(params.workspaceId);
    if (users.length === 0) {
      // MAJOR-events gedetecteerd maar geen ontvangers — anomaal (bv. lege org).
      // Loggen per silent-return-conventie zodat smoke/ops dit kan zien.
      console.warn('[notifyMajorEvents] geen ontvangers — notificaties overgeslagen', {
        workspaceId: params.workspaceId,
        competitorId: params.competitorId,
        majorCount: major.length,
      });
      return;
    }

    await prisma.notification.createMany({
      data: users.flatMap((u) =>
        major.map((a) => ({
          type: 'COMPETITOR_MAJOR_EVENT' as const,
          category: 'STRATEGY' as const,
          title: `${params.competitorName}: ${ACTIVITY_TYPE_LABEL[a.type] ?? a.type}`,
          description: a.summary.slice(0, 200),
          actionUrl: 'competitor-detail',
          workspaceId: params.workspaceId,
          userId: u.id,
        })),
      ),
    });

    invalidateCache(cacheKeys.prefixes.notifications(params.workspaceId));

    // Geen isEmailitConfigured()-guard: trySendTransactional no-opt + console.warn't
    // de payload zelf in dev (transactional.ts), wat per-user observability geeft.
    const subject =
      major.length === 1
        ? `${params.competitorName}: ${ACTIVITY_TYPE_LABEL[major[0].type] ?? major[0].type}`
        : `${major.length} belangrijke shifts bij ${params.competitorName}`;

    const itemsHtml = major
      .slice(0, MAX_EMAIL_EVENTS)
      .map(
        (a) =>
          `<li><strong>${escapeHtml(ACTIVITY_TYPE_LABEL[a.type] ?? a.type)}</strong> — ${escapeHtml(a.summary)}</li>`,
      )
      .join('');
    const overflow =
      major.length > MAX_EMAIL_EVENTS
        ? `<p>… en nog ${major.length - MAX_EMAIL_EVENTS} meer.</p>`
        : '';
    const detailUrl = buildCompetitorDetailUrl(params.competitorId);
    const html = `
      <p>Branddock detecteerde een aantal substantiële wijzigingen bij <strong>${escapeHtml(params.competitorName)}</strong>:</p>
      <ul>${itemsHtml}</ul>
      ${overflow}
      <p><a href="${detailUrl}">Bekijk in Branddock</a></p>
    `.trim();

    const text = [
      `Branddock detecteerde wijzigingen bij ${params.competitorName}:`,
      ...major
        .slice(0, MAX_EMAIL_EVENTS)
        .map((a) => `- ${ACTIVITY_TYPE_LABEL[a.type] ?? a.type}: ${a.summary}`),
      overflow ? `… en nog ${major.length - MAX_EMAIL_EVENTS} meer.` : '',
      `Bekijk: ${detailUrl}`,
    ]
      .filter(Boolean)
      .join('\n');

    await Promise.all(
      users
        .filter((u) => u.email)
        .map((u) =>
          trySendTransactional({
            to: u.email,
            subject,
            html,
            text,
            tags: { type: 'competitor-major-event' },
          }),
        ),
    );
  } catch (error) {
    console.warn('[notifyMajorEvents] failed:', error);
  }
}

function buildCompetitorDetailUrl(competitorId: string): string {
  const base = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
  return `${base}/?section=competitor-detail&id=${encodeURIComponent(competitorId)}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
