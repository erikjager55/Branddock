'use client';

// =============================================================
// /oauth/consent — consent-stap van de OAuth-connect-flow (MCP).
//
// Alleen bereikt bij prompt=consent: de mcp-plugin redirect dan vanaf
// /api/auth/mcp/authorize hierheen met ?consent_code=…&client_id=…&scope=…
// (aangewezen via oidcConfig.consentPage in src/lib/auth.ts). Toestaan/
// Weigeren POST naar Better Auth's /api/auth/oauth2/consent met
// { accept, consent_code }; de response bevat de redirectURI (mét code of
// met error=access_denied) waarheen we de browser navigeren.
//
// "Merken zijn taal"-batch: optionele merk-vergrendeling. Het vinkje +
// merk-select POSTen ná een geslaagde consent naar /api/oauth/consent-lock
// (OauthConsent.lockedWorkspaceId); zonder vinkje wordt een eventueel oud
// slot expliciet gewist. NB claude.ai stuurt de authorize doorgaans mét
// prompt=consent en komt dus langs dit scherm; een auto-consent-flow
// zónder prompt passeert het en kent geen slot (gedocumenteerde beperking).
// =============================================================

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ShieldCheck, Check, X, Loader2, AlertCircle, Lock } from 'lucide-react';

/** Leesbare omschrijving per OAuth/OIDC-scope op het consent-scherm. */
const SCOPE_DESCRIPTIONS: Record<string, string> = {
  openid: 'Confirm your identity',
  profile: 'View your name and profile picture',
  email: 'View your email address',
  offline_access: 'Keep access without asking again (refresh tokens)',
};

interface ClientInfo {
  name: string;
  icon: string | null;
}

interface BrandOption {
  workspaceId: string;
  name: string;
  organizationName: string;
}

function OAuthConsentForm() {
  const params = useSearchParams();
  const consentCode = params.get('consent_code');
  const clientId = params.get('client_id');
  const scopes = (params.get('scope') ?? '').split(' ').filter(Boolean);

  const [client, setClient] = useState<ClientInfo | null>(null);
  // Zonder client_id valt er niets te laden — initial state ipv setState-in-effect.
  const [loadingClient, setLoadingClient] = useState(Boolean(clientId));
  const [submitting, setSubmitting] = useState<'accept' | 'deny' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Merk-vergrendeling: memberships van de ingelogde user + selectie.
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');
  // Consent is al gegeven maar het slot faalde — bied "doorgaan zonder slot".
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  const invalidRequest = !consentCode || !clientId;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    fetch(`/api/oauth/client-info?client_id=${encodeURIComponent(clientId)}`)
      .then(async (res) => (res.ok ? ((await res.json()) as ClientInfo) : null))
      .then((info) => {
        if (!cancelled) setClient(info);
      })
      .catch(() => {
        // Naam is nice-to-have — zonder tonen we de client_id als fallback.
      })
      .finally(() => {
        if (!cancelled) setLoadingClient(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (invalidRequest) return;
    let cancelled = false;
    fetch('/api/oauth/my-brands')
      .then(async (res) => (res.ok ? ((await res.json()) as { brands?: BrandOption[] }) : null))
      .then((body) => {
        if (cancelled || !body?.brands) return;
        setBrands(body.brands);
        if (body.brands.length > 0) setSelectedBrand(body.brands[0].workspaceId);
      })
      .catch(() => {
        // Merk-lijst is nice-to-have — zonder blijft de checkbox verborgen.
      });
    return () => {
      cancelled = true;
    };
  }, [invalidRequest]);

  /**
   * Slot zetten (of expliciet wissen) ná een geslaagde consent. Wissen is
   * fail-soft; zetten niet — een stil ontbrekend slot zou onopgemerkt
   * toegang tot álle merken geven.
   */
  const applyBrandLock = async (): Promise<boolean> => {
    const workspaceId = lockEnabled && selectedBrand ? selectedBrand : null;
    try {
      const res = await fetch('/api/oauth/consent-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, workspaceId }),
      });
      return workspaceId === null ? true : res.ok;
    } catch {
      return workspaceId === null;
    }
  };

  const respond = async (accept: boolean) => {
    setSubmitting(accept ? 'accept' : 'deny');
    setError(null);
    try {
      const res = await fetch('/api/auth/oauth2/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept, consent_code: consentCode }),
      });
      const data = (await res.json()) as { redirectURI?: string; message?: string };
      if (!res.ok || !data.redirectURI) {
        setError(data.message || 'The authorization request is invalid or expired. Close this window and try connecting again.');
        setSubmitting(null);
        return;
      }
      if (accept) {
        const locked = await applyBrandLock();
        if (!locked) {
          setPendingRedirect(data.redirectURI);
          setError(
            'Access was authorized, but locking the connection to the selected brand failed. ' +
              'You can continue without the lock, or close this window and reconnect.',
          );
          setSubmitting(null);
          return;
        }
      }
      window.location.replace(data.redirectURI);
    } catch {
      setError('Something went wrong while processing your response. Please try again.');
      setSubmitting(null);
    }
  };

  const clientName = client?.name ?? clientId ?? 'Unknown application';

  return (
    <div data-testid="oauth-consent-page" className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/Logo_Branddock_RGB.png"
            alt="Branddock"
            width={220}
            height={39}
            priority
            className="mx-auto"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {invalidRequest ? (
            <div className="text-center py-4">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Invalid authorization request</h2>
              <p className="text-sm text-gray-500">
                This page is only reachable as part of an app authorization. Close this window and start the connection again.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Authorize access</h2>
                  <p className="text-sm text-gray-500" data-testid="oauth-consent-client">
                    {loadingClient ? 'Loading application…' : clientName}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-4">
                <span className="font-medium">{clientName}</span> wants to access your Branddock account with the following permissions:
              </p>

              <ul className="mb-6 space-y-2">
                {(scopes.length > 0 ? scopes : ['openid']).map((scope) => (
                  <li key={scope} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>
                      {SCOPE_DESCRIPTIONS[scope] ?? scope}
                      <span className="text-gray-400 ml-1">({scope})</span>
                    </span>
                  </li>
                ))}
              </ul>

              {brands.length > 0 && (
                <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      data-testid="oauth-consent-lock-checkbox"
                      type="checkbox"
                      checked={lockEnabled}
                      onChange={(e) => setLockEnabled(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[color:var(--primary)]"
                    />
                    <span className="text-sm text-gray-700">
                      <span className="font-medium flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-gray-500" />
                        Lock this connection to one brand
                      </span>
                      <span className="text-gray-500">
                        Without a lock, the connection follows your active organization in Branddock
                        and can switch between your brands.
                      </span>
                    </span>
                  </label>
                  {lockEnabled && (
                    <select
                      data-testid="oauth-consent-lock-brand"
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    >
                      {brands.map((brand) => (
                        <option key={brand.workspaceId} value={brand.workspaceId}>
                          {brand.name} — {brand.organizationName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {error && (
                <div
                  data-testid="oauth-consent-error"
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {pendingRedirect && (
                <button
                  data-testid="oauth-consent-continue"
                  type="button"
                  onClick={() => window.location.replace(pendingRedirect)}
                  className="mb-4 w-full border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Continue without brand lock
                </button>
              )}

              <div className="flex gap-3">
                <button
                  data-testid="oauth-consent-deny"
                  type="button"
                  disabled={submitting !== null}
                  onClick={() => respond(false)}
                  className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting === 'deny' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Deny
                </button>
                <button
                  data-testid="oauth-consent-allow"
                  type="button"
                  disabled={submitting !== null}
                  onClick={() => respond(true)}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting === 'accept' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Allow
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** /oauth/consent — useSearchParams vereist een Suspense-boundary in de App Router. */
export default function OAuthConsentPage() {
  return (
    <Suspense fallback={null}>
      <OAuthConsentForm />
    </Suspense>
  );
}
