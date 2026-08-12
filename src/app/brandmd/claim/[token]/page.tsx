'use client';

// =============================================================
// Claim-pagina (touchpoint 3.1) — endowment + goal gradient:
// registreren voelt als oogsten ("your brand is already here"),
// niet als invullen. Voorbereide onderdelen concreet tonen
// (pre-seeding zichtbaar maken — de +30-50%-activatie-les).
// =============================================================

import { use, useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, Loader2, ShieldCheck } from 'lucide-react';

const PRIMARY = '#1FD1B2';

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
    <main className="min-h-screen" style={{ backgroundColor: '#0B1220', color: '#E7ECF2' }}>
      <div className="mx-auto max-w-xl px-6 py-16">
        {!preview && !loadError && (
          <div className="flex items-center justify-center gap-2 py-20 text-sm" style={{ color: '#9FB0C3' }}>
            <Loader2 className="h-5 w-5 animate-spin" /> Loading your draft…
          </div>
        )}

        {loadError && (
          <div className="rounded-2xl border p-8 text-center" style={{ borderColor: '#26354D' }}>
            <p className="text-lg font-semibold">This link is no longer active</p>
            <p className="mt-2 text-sm" style={{ color: '#9FB0C3' }}>{loadError}</p>
            <a href="/brandmd" className="mt-4 inline-flex items-center gap-1 text-sm font-medium" style={{ color: PRIMARY }}>
              Re-scan your site free <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}

        {preview && !claimedWorkspaceId && (
          <div className="rounded-2xl border p-8" style={{ backgroundColor: '#111B2E', borderColor: '#26354D' }}>
            <p className="text-sm" style={{ color: '#9FB0C3' }}>{preview.domain}</p>
            <h1 className="mt-1 text-3xl font-bold">Your brand is already here.</h1>
            {preview.prepared.length > 0 && (
              <>
                <p className="mt-4 text-sm" style={{ color: '#9FB0C3' }}>
                  From your scan, we prepared:
                </p>
                <ul className="mt-2 space-y-1">
                  {preview.prepared.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4" style={{ color: PRIMARY }} /> {item}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-4 text-sm" style={{ color: '#9FB0C3' }}>
              Claim your workspace to complete the open fields — most brands finish in under 15
              minutes. Free for 28 days, no card.
            </p>

            {preview.status === 'CLAIMED' ? (
              <p className="mt-6 text-sm" style={{ color: '#9FB0C3' }}>
                This draft was already claimed. If that was you, open the app and pick the
                workspace “{preview.brandName}”.
              </p>
            ) : (
              <button
                onClick={claim}
                disabled={claiming}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold disabled:opacity-60"
                style={{ backgroundColor: PRIMARY, color: '#06251F' }}
              >
                {claiming ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Claim my brand
              </button>
            )}

            {needsLogin && (
              <div className="mt-4 rounded-lg border p-4 text-sm" style={{ borderColor: '#26354D', color: '#9FB0C3' }}>
                You need a (free) account first.{' '}
                <a href="/" className="font-medium underline underline-offset-2" style={{ color: PRIMARY }}>
                  Sign in or create one
                </a>
                , then open this claim link again — it stays yours.
              </div>
            )}
            {claimError && (
              <p className="mt-4 text-sm" style={{ color: '#F0B9B9' }}>{claimError}</p>
            )}
            {preview.emailBound && (
              <p className="mt-4 text-xs" style={{ color: '#5E7189' }}>
                This draft is bound to the email address it was generated with.
              </p>
            )}
          </div>
        )}

        {claimedWorkspaceId && (
          <div className="rounded-2xl border p-8 text-center" style={{ backgroundColor: '#111B2E', borderColor: PRIMARY }}>
            <Check className="mx-auto h-10 w-10" style={{ color: PRIMARY }} />
            <h1 className="mt-3 text-2xl font-bold">Claimed. Your workspace is ready.</h1>
            <p className="mt-2 text-sm" style={{ color: '#9FB0C3' }}>
              Your brand DNA from the scan is pre-filled — complete the open fields and generate
              your first on-brand content.
            </p>
            <a
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold"
              style={{ backgroundColor: PRIMARY, color: '#06251F' }}
            >
              Open your workspace <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
