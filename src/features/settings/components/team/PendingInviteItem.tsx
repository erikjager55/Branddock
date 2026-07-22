'use client';

import { useTranslation } from 'react-i18next';
import { useResendInvite, useCancelInvite } from '@/hooks/use-settings';
import { RoleBadge } from './RoleBadge';
import { Button } from '@/components/shared';
import { Mail, Clock } from 'lucide-react';
import { useFormat } from '@/lib/ui-i18n/format';
import type { PendingInvite } from '@/types/settings';

interface PendingInviteItemProps {
  invite: PendingInvite;
}

/** Fout-codes van de resend-route → i18n-key. Onbekend valt terug op generiek. */
const RESEND_ERROR_KEYS: Record<string, string> = {
  RESEND_COOLDOWN: 'pending.resendCooldown',
  WORKSPACE_GONE: 'pending.resendWorkspaceGone',
};

export function PendingInviteItem({ invite }: PendingInviteItemProps) {
  const { t } = useTranslation('settings-team');
  const { formatDate } = useFormat();
  const resendInvite = useResendInvite();
  const cancelInvite = useCancelInvite();

  // Calculate days until expiration
  const expiresAt = new Date(invite.expiresAt);
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const sentDate = formatDate(new Date(invite.createdAt), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // De resend-knop moet zeggen wat er écht gebeurde: de route kan de
  // vervaldatum verlengen terwijl de mail faalt, en kent een cooldown.
  const resendFeedback = resendInvite.isSuccess
    ? resendInvite.data?.emailSent === false
      ? { ok: false, message: t('pending.resendNotSent') }
      : { ok: true, message: t('pending.resendSent') }
    : resendInvite.isError
      ? {
          ok: false,
          message: t(
            RESEND_ERROR_KEYS[
              resendInvite.error instanceof Error ? resendInvite.error.message : ''
            ] ?? 'pending.resendFailed',
          ),
        }
      : null;

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Mail className="w-4 h-4 text-gray-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{invite.email}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <RoleBadge role={invite.role} />
            <span className="text-xs text-gray-400">{t('pending.sent', { date: sentDate })}</span>
          </div>
          {(invite.workspaceNames?.length ?? 0) > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {t('pending.scopedTo', { names: invite.workspaceNames!.join(', ') })}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {daysLeft > 0 ? t('pending.expiresIn', { count: daysLeft }) : t('pending.expired')}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => resendInvite.mutate(invite.id)}
          isLoading={resendInvite.isPending}
        >
          {t('pending.resend')}
        </Button>
        {resendFeedback ? (
          <span
            role="status"
            className={`text-xs ${resendFeedback.ok ? 'text-gray-500' : 'text-red-600'}`}
          >
            {resendFeedback.message}
          </span>
        ) : null}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => cancelInvite.mutate(invite.id)}
          isLoading={cancelInvite.isPending}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          {t('pending.cancel')}
        </Button>
      </div>
    </div>
  );
}
