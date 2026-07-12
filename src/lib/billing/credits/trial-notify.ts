// =============================================================
// Trial-vervalmeldingen (Fase 4) — T-3 en T-0 rond `trialEndsAt`.
//
// Draait in de dagelijkse expire-trials-cron. Zelfde in-app + e-mail-recept
// als notify-major-events (createMany + trySendTransactional, fail-soft).
//
// Dedup zónder schema-velden: een T-3-notificatie heeft per definitie
// `createdAt < trialEndsAt`, een T-0-notificatie `createdAt >= trialEndsAt`
// — één bestaans-query per venster voorkomt dat de dagelijkse cron
// (T-3 matcht op dag 25/26/27) dubbel stuurt.
//
// Scope: alleen échte trial-orgs — zelfde criteria als de lock
// (geen unlimited, geen betaal-historie via lifetimeGranted/subscription).
// =============================================================

import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { TRIAL_CREDITS } from '@/lib/constants/plan-limits';
import { trySendTransactional } from '@/lib/email/transactional';
import { getWorkspaceUsers } from '@/lib/workspace/workspace-users';

const T3_MS = 3 * 86_400_000;
const DAY_MS = 86_400_000;
// Ruim T-0-venster: één gemiste cron-run (storing/deploy) mag de melding niet
// voorgoed laten vervallen — de dedup voorkomt dubbelen toch al.
const T0_LOOKBACK_MS = 3 * 86_400_000;

interface TrialNotice {
  phase: 'T-3' | 'T-0';
  title: string;
  description: string;
  subject: string;
  html: (daysLeft: number) => string;
}

const NOTICES: Record<'T3' | 'T0', TrialNotice> = {
  T3: {
    phase: 'T-3',
    title: 'Je gratis trial loopt bijna af',
    description:
      'Over enkele dagen eindigt je trialperiode. Kies een plan of neem contact op om zonder onderbreking door te werken — je merkdata blijft altijd bewaard.',
    subject: 'Je Branddock-trial loopt over een paar dagen af',
    html: (daysLeft) =>
      `
      <p>Je gratis Branddock-trial eindigt over <strong>${daysLeft} ${daysLeft === 1 ? 'dag' : 'dagen'}</strong>.</p>
      <p>Daarna gaan genereren en nieuwe items aanmaken op slot, maar je merkdata blijft veilig en volledig zichtbaar. Kies een plan of neem contact op om zonder onderbreking door te werken.</p>
    `.trim(),
  },
  T0: {
    phase: 'T-0',
    title: 'Je gratis trial is afgelopen',
    description:
      'Je trialperiode is geëindigd. Je merkdata staat veilig en blijft zichtbaar; activeer je account om weer te kunnen genereren en nieuwe items aan te maken.',
    subject: 'Je Branddock-trial is afgelopen — je merkdata staat veilig',
    html: () =>
      `
      <p>Je gratis Branddock-trial is <strong>afgelopen</strong>.</p>
      <p>Je merkdata staat veilig en blijft volledig zichtbaar. Activeer je account (plan of credits) om weer te kunnen genereren en nieuwe items aan te maken.</p>
    `.trim(),
  },
};

/**
 * Stuur T-3/T-0-meldingen voor aflopende no-card trials. Fail-soft per org:
 * één kapotte org mag de rest (en de expiry zelf) nooit blokkeren.
 * Retourneert het aantal orgs waarvoor een melding is verstuurd.
 */
export async function notifyExpiringTrials(now = new Date()): Promise<number> {
  const horizon = new Date(now.getTime() + T3_MS);
  const t0Floor = new Date(now.getTime() - T0_LOOKBACK_MS);

  // Kandidaten: trial eindigt binnen 3 dagen (T-3) of is < 72u geleden
  // verstreken (T-0-lookback). Betaal-historie sluit uit — zelfde lens als de lock.
  const orgs = await prisma.organization.findMany({
    where: {
      trialEndsAt: { gte: t0Floor, lte: horizon },
      unlimitedCredits: false,
      OR: [
        { creditBalance: null },
        { creditBalance: { lifetimeGranted: { lte: TRIAL_CREDITS } } },
      ],
      NOT: { subscriptionStatus: 'ACTIVE', stripeSubscriptionId: { not: null } },
    },
    select: {
      id: true,
      trialEndsAt: true,
      workspaces: { select: { id: true }, orderBy: { createdAt: 'asc' } },
    },
  });

  let notified = 0;
  for (const org of orgs) {
    try {
      if (!org.trialEndsAt || org.workspaces.length === 0) continue;
      const expired = org.trialEndsAt.getTime() <= now.getTime();
      const notice = expired ? NOTICES.T0 : NOTICES.T3;
      const workspaceIds = org.workspaces.map((w) => w.id);
      const trialEndsAt = org.trialEndsAt;

      // Dedup-venster: T-3-meldingen ontstaan vóór trialEndsAt, T-0-meldingen
      // erna — de createdAt-grens onderscheidt ze. Check PER workspace (niet
      // org-breed): een partial failure halverwege de workspace-loop mag de
      // overige workspaces niet permanent overslaan.
      const dedupWindow = expired
        ? { gte: trialEndsAt }
        : { gte: new Date(trialEndsAt.getTime() - T3_MS), lt: trialEndsAt };

      const daysLeft = Math.max(1, Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY_MS));
      const seen = new Set<string>();
      let anyCreated = false;

      for (const workspaceId of workspaceIds) {
        const already = await prisma.notification.findFirst({
          where: { workspaceId, type: 'TRIAL_EXPIRING', createdAt: dedupWindow },
          select: { id: true },
        });
        if (already) continue;

        const users = await getWorkspaceUsers(workspaceId);
        if (users.length === 0) continue;

        await prisma.notification.createMany({
          data: users.map((u) => ({
            type: 'TRIAL_EXPIRING' as const,
            category: 'SYSTEM' as const,
            title: notice.title,
            description: notice.description,
            actionUrl: 'settings',
            workspaceId,
            userId: u.id,
          })),
        });
        invalidateCache(cacheKeys.prefixes.notifications(workspaceId));
        anyCreated = true;

        await Promise.all(
          users
            .filter((u) => u.email && !seen.has(u.email))
            .map((u) => {
              seen.add(u.email);
              return trySendTransactional({
                to: u.email,
                subject: notice.subject,
                html: notice.html(daysLeft),
                text: notice.description,
                tags: { type: 'trial-expiring', phase: notice.phase },
              });
            }),
        );
      }

      if (anyCreated) notified += 1;
    } catch (error) {
      console.warn('[notifyExpiringTrials] org overgeslagen na fout', {
        orgId: org.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return notified;
}
