'use client';

// =============================================================
// Claim-pagina (touchpoint 3.1) — endowment + goal gradient:
// registreren voelt als oogsten ("your brand is already here"),
// niet als invullen. Voorbereide onderdelen concreet tonen
// (pre-seeding zichtbaar maken — de +30-50%-activatie-les).
// Styling: marketing-site (licht, mkt-tokens) — integratie 2026-08-14.
// =============================================================

import { use, useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, Loader2, ShieldCheck } from 'lucide-react';
import { appHref } from '../../../marketing/app-url';

const ACCENT_INK = 'var(--link-ink)';

interface ClaimPreview {
  brandName: string;
  domain: string;
  score: number | null;
  status: 'DRAFT' | 'CLAIMED' | 'EXPIRED';
  expiresAt: string;
  emailBound: boolean;
  prepared: string[];
  supportedPayload: boolean;
}

export default function BrandMdClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [preview, setPreview] = useState<ClaimPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimedWorkspaceId, setClaimedWorkspaceId] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/brandmd/claim/${token}`);
        const data = (await res.json()) as ClaimPreview & { error?: string };
        if (cancelled) return;
        if (!res.ok) setLoadError(data.error ?? 'This claim link is unknown or expired.');
        else setPreview(data);
      } catch {
        if (!cancelled) setLoadError('Something went wrong loading this draft.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const claim = useCallback(async () => {
    setClaiming(true);
    setClaimError(null);
    setNeedsLogin(false);
    try {
      const res = await fetch(`/api/brandmd/claim/${token}`, { method: 'POST' });
      const data = (await res.json()) as { workspaceId?: string; error?: string; code?: string };
      if (res.status === 401) {
        setNeedsLogin(true);
        return;
      }
      if (!res.ok || !data.workspaceId) {
        setClaimError(data.error ?? 'Claim failed — please try again.');
        return;
      }
      setClaimedWorkspaceId(data.workspaceId);
    } catch {
      setClaimError('Claim failed — please try again.');
    } finally {
      setClaiming(false);
    }
  }, [token]);

  return (
    <div className="mkt-hero-glow">
      <div className="mx-auto max-w-xl px-6 py-16">
        {!preview && !loadError && (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading your draft…
          </div>
        )}

        {loadError && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-gray-900">This link is no longer active</p>
            <p className="mt-2 text-sm text-gray-600">{loadError}</p>
            <a
              href="/brandmd"
              className="mkt-accent mt-4 inline-flex items-center gap-1 text-sm font-medium"
            >
              Re-scan your site free <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}

        {preview && !claimedWorkspaceId && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-gray-500">{preview.domain}</p>
            <h1 className="mt-1 text-3xl">Your brand is already here.</h1>
            {preview.prepared.length > 0 && (
              <>
                <p className="mt-4 text-sm text-gray-600">From your scan, we prepared:</p>
                <ul className="mt-2 space-y-1">
                  {preview.prepared.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="h-4 w-4" style={{ color: ACCENT_INK }} /> {item}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-4 text-sm text-gray-600">
              Claim your workspace to complete the open fields — most brands finish in under 15
              minutes. Free for 28 days, no card.
            </p>

            {preview.status === 'CLAIMED' ? (
              <p className="mt-6 text-sm text-gray-600">
                This draft was already claimed. If that was you, open the app and pick the
                workspace “{preview.brandName}”.
              </p>
            ) : (
              <button
                onClick={claim}
                disabled={claiming}
                className="mkt-btn-primary mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold disabled:opacity-60"
              >
                {claiming ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Claim my brand
              </button>
            )}

            {needsLogin && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                You need a (free) account first.{' '}
                {/* appHref: de app draait op app.branddock.app — een relatieve '/'
                    zou op de apex de marketing-homepage tonen. */}
                <a
                  href={appHref('/?view=register&utm_source=brandmd&utm_medium=claim-login')}
                  className="mkt-accent font-medium underline underline-offset-2"
                >
                  Sign in or create one
                </a>
                , then open this claim link again — it stays yours.
              </div>
            )}
            {claimError && <p className="mt-4 text-sm text-red-600">{claimError}</p>}
            {preview.emailBound && (
              <p className="mt-4 text-xs text-gray-500">
                This draft is bound to the email address it was generated with.
              </p>
            )}
          </div>
        )}

        {claimedWorkspaceId && (
          <div
            className="rounded-2xl border bg-white p-8 text-center shadow-sm"
            style={{ borderColor: 'var(--primary)' }}
          >
            <Check className="mx-auto h-10 w-10" style={{ color: ACCENT_INK }} />
            <h1 className="mt-3 text-2xl">Claimed. Your workspace is ready.</h1>
            <p className="mt-2 text-sm text-gray-600">
              Your brand DNA from the scan is pre-filled — complete the open fields and generate
              your first on-brand content.
            </p>
            <a
              href={appHref('/?utm_source=brandmd&utm_medium=claim-success')}
              className="mkt-btn-primary mt-6 inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold"
            >
              Open your workspace <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
