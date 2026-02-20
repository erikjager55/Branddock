'use client';

import { usePendingInvites } from '@/hooks/use-settings';
import { PendingInviteItem } from './PendingInviteItem';
import { Skeleton } from '@/components/shared';
import { UserPlus } from 'lucide-react';

export function PendingInvites() {
  const { data, isLoading } = usePendingInvites();

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <Skeleton className="rounded" width={150} height={14} />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="rounded-full" width={32} height={32} />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="rounded" width="50%" height={12} />
                <Skeleton className="rounded" width="30%" height={10} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const invites = data?.invites ?? [];

  if (invites.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Pending Invitations</h3>
        </div>
        <div className="text-center py-4">
          <UserPlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No pending invitations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Pending Invitations</h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          {invites.length}
        </span>
      </div>

      <div>
        {invites.map((invite) => (
          <PendingInviteItem key={invite.id} invite={invite} />
        ))}
      </div>
    </div>
  );
}
