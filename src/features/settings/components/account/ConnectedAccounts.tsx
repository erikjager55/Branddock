'use client';

import { useConnectedAccounts } from '@/hooks/use-settings';
import { Card, Skeleton } from '@/components/shared';
import { ConnectedAccountItem } from './ConnectedAccountItem';

export function ConnectedAccounts() {
  const { data, isLoading } = useConnectedAccounts();

  const accounts = data?.accounts ?? [];

  if (isLoading) {
    return (
      <Card>
        <Skeleton className="rounded" width="50%" height={20} />
        <div className="mt-4 space-y-3">
          <Skeleton className="rounded" width="100%" height={56} />
          <Skeleton className="rounded" width="100%" height={56} />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-base font-semibold text-gray-900 mb-4">Connected Accounts</h3>

      {accounts.length === 0 ? (
        <p className="text-sm text-gray-500">No connected accounts yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {accounts.map((account) => (
            <ConnectedAccountItem key={account.id} account={account} />
          ))}
        </div>
      )}
    </Card>
  );
}
