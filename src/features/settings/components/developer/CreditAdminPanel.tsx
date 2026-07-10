'use client';

import { useState } from 'react';
import { Coins, Infinity as InfinityIcon, Loader2, Plus } from 'lucide-react';
import { Card, Badge, Button } from '@/components/shared';
import { useCreditAdminOrgs, useCreditAdminAction, type AdminOrg } from '@/hooks/use-credit-admin';

/**
 * Superuser-paneel (Settings → Developer → Credits): per organisatie credits
 * toekennen of onbeperkt-gratis maken (pilot-comps). Werkt ook met credits-uit,
 * zodat pilot-orgs vóór de credit-launch voorbereid kunnen worden.
 */
export function CreditAdminPanel() {
  const { data: orgs, isLoading, isError } = useCreditAdminOrgs(true);

  return (
    <div className="max-w-4xl space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Credit Admin</h2>
        <p className="mt-1 text-sm text-gray-500">
          Grant credits or give organizations unlimited free access (pilot comps). Superuser only.
        </p>
      </div>

      {isError && (
        <Card padding="lg">
          <p className="text-sm text-red-600">Could not load organizations (superuser access required).</p>
        </Card>
      )}

      {isLoading && (
        <Card padding="lg">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        </Card>
      )}

      {orgs && (
        <div className="space-y-3">
          {orgs.map((org) => (
            <OrgRow key={org.id} org={org} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrgRow({ org }: { org: AdminOrg }) {
  const action = useCreditAdminAction();
  const [amount, setAmount] = useState('');

  const grant = () => {
    const credits = Math.round(Number(amount));
    if (!Number.isFinite(credits) || credits <= 0) return;
    action.mutate({ action: 'grant', organizationId: org.id, credits }, { onSuccess: () => setAmount('') });
  };

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">{org.name}</h3>
            {org.unlimited && (
              <Badge variant="teal" size="sm" icon={InfinityIcon}>Unlimited</Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {org.members} {org.members === 1 ? 'member' : 'members'}
            {org.workspaces.length > 0 && <> &middot; {org.workspaces.join(', ')}</>}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!org.unlimited && (
            <div className="flex items-center gap-1.5 text-sm tabular-nums text-gray-700">
              <Coins className="h-4 w-4 text-gray-400" />
              {org.balance}
              {org.reserved > 0 && <span className="text-xs text-gray-400">({org.reserved} reserved)</span>}
            </div>
          )}

          {!org.unlimited && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="credits"
                className="h-8 w-24 rounded-md border border-gray-200 px-2 text-sm focus:border-primary focus:outline-none"
              />
              <Button variant="secondary" size="sm" onClick={grant} disabled={action.isPending || !amount}>
                {action.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Grant
              </Button>
            </div>
          )}

          <Button
            variant={org.unlimited ? 'secondary' : 'primary'}
            size="sm"
            disabled={action.isPending}
            onClick={() => action.mutate({ action: 'setUnlimited', organizationId: org.id, value: !org.unlimited })}
          >
            <InfinityIcon className="h-3.5 w-3.5" />
            {org.unlimited ? 'Disable unlimited' : 'Make unlimited'}
          </Button>
        </div>
      </div>

      {action.isError && (
        <p className="mt-2 text-xs text-red-600">{(action.error as Error)?.message ?? 'Action failed.'}</p>
      )}
    </Card>
  );
}
