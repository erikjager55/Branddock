'use client';

import { useResendInvite, useCancelInvite } from '@/hooks/use-settings';
import { RoleBadge } from './RoleBadge';
import { Button } from '@/components/shared';
import { Mail, Clock } from 'lucide-react';
import type { PendingInvite } from '@/types/settings';

interface PendingInviteItemProps {
  invite: PendingInvite;
}

export function PendingInviteItem({ invite }: PendingInviteItemProps) {
  const resendInvite = useResendInvite();
  const cancelInvite = useCancelInvite();

  // Calculate days until expiration
  const expiresAt = new Date(invite.expiresAt);
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const sentDate = new Date(invite.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

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
            <span className="text-xs text-gray-400">Sent {sentDate}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {daysLeft > 0 ? `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'Expired'}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => resendInvite.mutate(invite.id)}
          isLoading={resendInvite.isPending}
        >
          Resend
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => cancelInvite.mutate(invite.id)}
          isLoading={cancelInvite.isPending}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
