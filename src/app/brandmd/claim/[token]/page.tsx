'use client';

// =============================================================
// Claim-pagina (touchpoint 3.1): endowment + goal gradient. Registreren voelt
// als oogsten ("je merk staat al klaar"), niet als invullen. Nederlands sinds
// 2026-08-21 (besluit Erik) — de pagina was als enige van de funnel Engels en
// erfde daardoor een taalattribuut dat niet bij de tekst paste. Voorbereide onderdelen concreet tonen
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
  const [deepScanStarted, setDeepScanStarted] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/brandmd/claim/${token}`);
        const data = (await res.json()) as ClaimPreview & { error?: string };
        if (cancelled) return;
        if (!res.ok) setLoadError(data.error ?? 'Deze claim-link is onbekend of verlopen.');
        else setPreview(data);
      } catch {
        if (!cancelled) setLoadError('Er ging iets mis bij het laden van je concept.');
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
      const data = (await res.json()) as {
        workspaceId?: string;
        deepScanStarted?: boolean;
        error?: string;
        code?: string;
      };
      if (res.status === 401) {
        setNeedsLogin(true);
        return;
      }
      if (!res.ok || !data.workspaceId) {
        setClaimError(data.error ?? 'Claimen is niet gelukt. Probeer het opnieuw.');
        return;
      }
      setClaimedWorkspaceId(data.workspaceId);
      setDeepScanStarted(data.deepScanStarted === true);
    } catch {
      setClaimError('Claimen is niet gelukt. Probeer het opnieuw.');
    } finally {
      setClaiming(false);
    }
  }, [token]);

  return (
    <div className="mkt-hero-glow">
      <div className="mx-auto max-w-xl px-6 py-16">
        {!preview && !loadError && (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" /> Je concept wordt geladen…
          </div>
        )}

        {loadError && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-gray-900">Deze link werkt niet meer</p>
            <p className="mt-2 text-sm text-gray-600">{loadError}</p>
            <a
              href="/brandmd"
              className="mkt-accent mt-4 inline-flex items-center gap-1 text-sm font-medium"
            >
              Scan je site opnieuw, gratis <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}

        {preview && !claimedWorkspaceId && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-gray-500">{preview.domain}</p>
            <h1 className="mt-1 text-3xl">Je merk staat al klaar.</h1>
            {preview.prepared.length > 0 && (
              <>
                <p className="mt-4 text-sm text-gray-600">Uit je scan hebben we dit alvast klaargezet:</p>
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
              Claim je workspace en vul de open velden aan. De meeste merken zijn binnen een
              kwartier klaar. 28 dagen gratis, zonder creditcard.
            </p>

            {preview.status === 'CLAIMED' ? (
              <p className="mt-6 text-sm text-gray-600">
                Dit concept is al geclaimd. Was jij dat? Open de app en kies de workspace
                “{preview.brandName}”.
              </p>
            ) : (
              <button
                onClick={claim}
                disabled={claiming}
                className="mkt-btn-primary mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold disabled:opacity-60"
              >
                {claiming ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Claim mijn merk
              </button>
            )}

            {needsLogin && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                Je hebt eerst een (gratis) account nodig.{' '}
                {/* appHref: de app draait op app.branddock.app — een relatieve '/'
                    zou op de apex de marketing-homepage tonen. */}
                <a
                  href={appHref('/?view=register&utm_source=brandmd&utm_medium=claim-login')}
                  className="mkt-accent font-medium underline underline-offset-2"
                >
                  Inloggen of er een aanmaken
                </a>
                . Open daarna deze claim-link opnieuw; hij blijft van jou.
              </div>
            )}
            {claimError && <p className="mt-4 text-sm text-red-600">{claimError}</p>}
            {preview.emailBound && (
              <p className="mt-4 text-xs text-gray-500">
                Dit concept is gekoppeld aan het e-mailadres waarmee het is gemaakt.
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
            <h1 className="mt-3 text-2xl">Geclaimd. Je workspace staat klaar.</h1>
            <p className="mt-2 text-sm text-gray-600">
              Je merk-DNA uit de scan staat al ingevuld. Vul de open velden aan en maak je
              eerste on-brand content.
            </p>
            {deepScanStarted && (
              <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                We zijn ook een <span className="font-medium text-gray-900">diepe scan</span>{' '}
                van je site gestart (maximaal 15 pagina&apos;s) om je merkfundament, persona&apos;s
                en visuele identiteit op te stellen. Bekijk en gebruik de resultaten onder{' '}
                <span className="font-medium text-gray-900">Website Scanner</span> in je
                workspace; dat duurt een paar minuten.
              </p>
            )}
            <a
              href={appHref('/?utm_source=brandmd&utm_medium=claim-success')}
              className="mkt-btn-primary mt-6 inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold"
            >
              Open je workspace <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
