'use client';

// =============================================================
// /settings/integrations/ad-accounts
//
// Lijst van ConnectedAdAccount rows. "Connect Meta" knop start
// OAuth-flow via /api/ad-accounts/meta/connect. Refresh-knop
// per row triggert manual token-refresh.
//
// Buiten de SPA-chrome (App.tsx switch) want OAuth-callback
// landing-page. User komt hier via direct link of via callback.
// =============================================================

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plug,
  RefreshCw,
  Unplug,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { PageShell, PageHeader } from '@/components/ui/layout';

interface AdAccountRow {
  id: string;
  platform: string;
  externalAccountId: string;
  accountName: string | null;
  currency: string | null;
  timezone: string | null;
  status: 'active' | 'expired' | 'revoked' | 'error';
  tokenExpiresAt: string | null;
  lastRefreshedAt: string | null;
  lastErrorMessage: string | null;
  connectedBy: { id: string; name: string | null; email: string };
  _count: { campaigns: number };
  createdAt: string;
}

const STATUS_BADGE: Record<AdAccountRow['status'], { label: string; icon: typeof CheckCircle2; color: string }> = {
  active: { label: 'Connected', icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-50' },
  expired: { label: 'Token expired', icon: AlertTriangle, color: 'text-amber-700 bg-amber-50' },
  revoked: { label: 'Revoked', icon: XCircle, color: 'text-gray-600 bg-gray-100' },
  error: { label: 'Error', icon: AlertTriangle, color: 'text-red-700 bg-red-50' },
};

async function fetchAccounts(): Promise<AdAccountRow[]> {
  const res = await fetch('/api/ad-accounts');
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const data = (await res.json()) as { accounts: AdAccountRow[] };
  return data.accounts;
}

export default function AdAccountsPage() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['ad-accounts'], queryFn: fetchAccounts });

  async function refresh(accountId: string) {
    setBusyId(accountId);
    try {
      const res = await fetch('/api/ad-accounts/meta/refresh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
        alert(`Refresh failed: ${body.detail ?? body.error ?? res.statusText}`);
      }
      queryClient.invalidateQueries({ queryKey: ['ad-accounts'] });
    } finally {
      setBusyId(null);
    }
  }

  async function disconnect(accountId: string, activeCount: number) {
    const note = activeCount > 0
      ? `Je hebt ${activeCount} actieve campagnes via dit account — die blijven draaien in Meta maar Branddock kan niet meer pollen/aanpassen tot je opnieuw verbindt. Doorgaan?`
      : 'Weet je zeker dat je dit account wilt loskoppelen?';
    if (!confirm(note)) return;
    setBusyId(accountId);
    try {
      const res = await fetch(`/api/ad-accounts/meta/disconnect?accountId=${encodeURIComponent(accountId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        alert(`Disconnect failed: ${body.error ?? res.statusText}`);
      }
      queryClient.invalidateQueries({ queryKey: ['ad-accounts'] });
    } finally {
      setBusyId(null);
    }
  }

  const accounts = query.data ?? [];

  return (
    <PageShell maxWidth="5xl">
      <div>
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
          Back to Branddock
        </Link>
      </div>

      <PageHeader
        moduleKey="settings"
        title="Ad accounts"
        subtitle="Koppel Meta, LinkedIn of Google ad-accounts om campagnes vanuit Branddock te publiceren."
        actions={
          <a
            href="/api/ad-accounts/meta/connect"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg"
          >
            <Plug className="w-4 h-4" />
            Connect Meta
          </a>
        }
      />

      {query.isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {query.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Kan ad-accounts niet laden: {(query.error as Error).message}
        </div>
      )}

      {query.data && accounts.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <Plug className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <h2 className="text-base font-semibold text-gray-900">Nog geen ad-accounts gekoppeld</h2>
          <p className="text-sm text-gray-600 mt-1 max-w-md mx-auto">
            Verbind een Meta Business Manager ad-account om campagnes vanuit Branddock te publiceren.
            Branddock publiceert standaard als PAUSED — je activeert pas in Meta Business Manager zelf.
          </p>
        </div>
      )}

      {accounts.length > 0 && (
        <div className="space-y-3">
          {accounts.map((account) => {
            const badge = STATUS_BADGE[account.status] ?? STATUS_BADGE.error;
            const BadgeIcon = badge.icon;
            const isBusy = busyId === account.id;
            return (
              <div key={account.id} className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        {account.platform}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {account.accountName ?? account.externalAccountId}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {account.externalAccountId} · {account.currency ?? '—'} · {account.timezone ?? '—'}
                    </p>
                    <div className="mt-3 text-xs text-gray-600 space-y-0.5">
                      <p>Gekoppeld door {account.connectedBy.name ?? account.connectedBy.email}</p>
                      {account.tokenExpiresAt && (
                        <p>
                          Token verloopt op {new Date(account.tokenExpiresAt).toLocaleDateString()}
                          {' · '}
                          {account._count.campaigns} campagne{account._count.campaigns === 1 ? '' : 's'}
                        </p>
                      )}
                      {account.lastErrorMessage && (
                        <p className="text-red-700">Laatste fout: {account.lastErrorMessage}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {account.status !== 'revoked' && (
                      <button
                        onClick={() => refresh(account.id)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Refresh
                      </button>
                    )}
                    {account.status !== 'revoked' && (
                      <button
                        onClick={() => disconnect(account.id, account._count.campaigns)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-200 disabled:opacity-50"
                      >
                        <Unplug className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
