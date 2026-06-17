'use client';

// =============================================================
// /settings/integrations/ad-accounts/select?session=<id>
//
// Post-OAuth landing page. Loads the pending-session via API,
// renders a list of ad-accounts the user has access to, and
// lets them POST one to /api/ad-accounts/meta/select.
//
// Error states (?error=<code>&detail=<msg>) komen ook hier
// binnen wanneer de callback faalt.
// =============================================================

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2, Building2 } from 'lucide-react';
import { PageShell, PageHeader } from '@/components/ui/layout';

interface PendingAccount {
  id: string;
  accountId: string;
  name: string;
  currency: string;
  timezone: string;
  accountStatus: number;
  business: { id: string; name: string } | null;
}

interface PendingPayload {
  platform: string;
  tokenExpiresAt: string;
  availableAccounts: PendingAccount[];
}

const ERROR_LABELS: Record<string, string> = {
  missing_params: 'The OAuth flow was missing required parameters.',
  invalid_state: 'The CSRF state token has expired or is invalid. Please try connecting again.',
  no_ad_accounts: 'No ad accounts found under this Meta account.',
  not_configured: 'Meta integration is not configured (META_APP_ID/SECRET missing).',
  meta_api_error: 'The Meta API returned an error.',
  internal_error: 'Internal error during the OAuth flow.',
};

/**
 * useSearchParams() vereist een Suspense-boundary tijdens prerender (Next.js
 * static-export gate). Default-export wrapt de inner component zodat de
 * build niet crasht op deze client-only page; de Suspense-fallback wordt
 * praktisch nooit getoond (route is volledig client-side).
 */
export default function AdAccountSelectPage() {
  return (
    <Suspense
      fallback={
        <PageShell maxWidth="3xl">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </PageShell>
      }
    >
      <AdAccountSelectInner />
    </Suspense>
  );
}

function AdAccountSelectInner() {
  const router = useRouter();
  const search = useSearchParams();
  const sessionId = search.get('session');
  const errorCode = search.get('error');
  const errorDetail = search.get('detail');

  const [pending, setPending] = useState<PendingPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    fetch(`/api/ad-accounts/meta/select?sessionId=${encodeURIComponent(sessionId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<PendingPayload>;
      })
      .then((data) => {
        if (!cancelled) setPending(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function submit() {
    if (!sessionId || !chosenId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/ad-accounts/meta/select', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, externalAccountId: chosenId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        alert(`Connection failed: ${body.error ?? res.statusText}`);
        setSubmitting(false);
        return;
      }
      router.push('/settings/integrations/ad-accounts');
    } catch (err) {
      alert(`Connection failed: ${(err as Error).message}`);
      setSubmitting(false);
    }
  }

  // Error landing — callback gaf ?error=… terug
  if (errorCode) {
    return (
      <PageShell maxWidth="3xl">
        <Link href="/settings/integrations/ad-accounts" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
          Back to ad accounts
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-700 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-red-900">OAuth flow aborted</h2>
              <p className="text-sm text-red-800 mt-1">
                {ERROR_LABELS[errorCode] ?? `Unknown error: ${errorCode}`}
              </p>
              {errorDetail && <p className="text-xs text-red-700 mt-2 font-mono">{errorDetail}</p>}
              <a
                href="/api/ad-accounts/meta/connect"
                className="inline-block mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg"
              >
                Try again
              </a>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!sessionId) {
    return (
      <PageShell maxWidth="3xl">
        <p className="text-sm text-gray-600">No session ID — open this page through the OAuth flow.</p>
        <Link href="/settings/integrations/ad-accounts" className="text-sm text-emerald-700 hover:underline">
          To ad accounts overview
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="3xl">
      <Link
        href="/settings/integrations/ad-accounts"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to ad accounts
      </Link>

      <PageHeader
        moduleKey="settings"
        title="Choose an ad account"
        subtitle="Which Meta ad account would you like to connect to this workspace?"
      />

      {!pending && !loadError && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {loadError}
        </div>
      )}

      {pending && pending.availableAccounts.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This Meta account has no ad accounts. Check in Business Manager that the logged-in user has access.
        </div>
      )}

      {pending && pending.availableAccounts.length > 0 && (
        <>
          <div className="space-y-2">
            {pending.availableAccounts.map((account) => {
              const selected = chosenId === account.id;
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setChosenId(account.id)}
                  className={`w-full text-left rounded-lg border p-4 transition ${
                    selected
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{account.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">{account.id}</p>
                      <p className="text-xs text-gray-600 mt-2">
                        {account.currency} · {account.timezone}
                      </p>
                      {account.business && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {account.business.name}
                        </p>
                      )}
                    </div>
                    {selected && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/settings/integrations/ad-accounts"
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={submit}
              disabled={!chosenId || submitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Connect account
            </button>
          </div>
        </>
      )}
    </PageShell>
  );
}
