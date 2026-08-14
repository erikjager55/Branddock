'use client';

// =============================================================
// brand.md generator — publieke client-UI
//
// v3 (integratie 2026-08-14): volwaardig onderdeel van de
// marketing-site — licht kleurschema, marketing-tokens (mkt-*),
// nav+footer via de /brandmd-layout. Inhoudelijk ongewijzigd
// t.o.v. v2: leken-laag op de resultaatpagina, use-paneel vóór
// download, en de HARDE e-mail-gate (server-side afgedwongen via
// /api/brandmd/download) met rapport-mail-belofte.
// =============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';

// Leesbare merk-inkt op wit (AA) — zie marketing.css UX-01.
const ACCENT_INK = 'var(--link-ink)';

interface ScoreDimension {
  key: string;
  label: string;
  score: number;
  weight: number;
  explanation: string;
}

interface HumanFinding {
  positive: boolean;
  text: string;
}

interface GenerateResult {
  token: string;
  brandName: string;
  domain: string;
  fileName: string;
  score: number;
  dimensions: ScoreDimension[];
  findings: HumanFinding[];
  scannedPaths: string[];
  validatedSections: number;
  totalSections: number;
  claimUrl: string | null;
  expiresAt: string;
}

const PROGRESS_LINES = [
  'Reading your site…',
  'Looking for your about and services pages…',
  'Extracting your color system…',
  'Listening to your tone of voice…',
  "Checking what we can't verify — we'll mark it honestly",
  'Building your brand.md…',
];

const USE_RECIPES: Array<{ tool: string; recipe: string; copyText?: string }> = [
  {
    tool: 'Claude',
    recipe: 'Create a Project → drag brand.md in → every chat is on-brand.',
    copyText:
      'Use the attached brand.md as the single source of truth for this brand. Follow its voice, guardrails and audience in everything you write.',
  },
  {
    tool: 'ChatGPT',
    recipe: 'Settings → Custom Instructions → paste the Voice section.',
  },
  {
    tool: 'Cursor / coding agents',
    recipe: 'Drop brand.md in your repo root, next to AGENTS.md. Done.',
  },
  {
    tool: 'Any AI chat',
    recipe: "Paste the whole file above your prompt. It's only ~2 pages.",
  },
];

export function GeneratorClient() {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle');
  const [progressIdx, setProgressIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [email, setEmail] = useState('');
  const [gateBusy, setGateBusy] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  const generate = useCallback(async () => {
    if (!url.trim()) return;
    setPhase('scanning');
    setError(null);
    setResult(null);
    setDownloaded(false);
    setGateError(null);
    setProgressIdx(0);
    progressTimer.current = setInterval(() => {
      setProgressIdx((i) => Math.min(i + 1, PROGRESS_LINES.length - 1));
    }, 4500);
    try {
      const res = await fetch('/api/brandmd/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await res.json()) as GenerateResult & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? 'Scan failed');
      }
      setResult(data);
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed');
      setPhase('error');
    } finally {
      if (progressTimer.current) clearInterval(progressTimer.current);
    }
  }, [url]);

  // Harde gate: e-mail vastleggen → daarna levert de server het bestand.
  const unlockAndDownload = useCallback(async () => {
    if (!result || !email.trim()) return;
    setGateBusy(true);
    setGateError(null);
    try {
      const track = await fetch('/api/brandmd/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: result.token, event: 'email', email: email.trim() }),
      });
      if (!track.ok) {
        const data = (await track.json()) as { error?: string };
        throw new Error(data.error ?? 'Could not save your email');
      }
      const res = await fetch(`/api/brandmd/download?token=${encodeURIComponent(result.token)}`);
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Download failed');
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
      a.download = result.fileName;
      a.click();
      // Niet synchroon revoken: Firefox/Safari hebben de blob-URL dan soms
      // nog niet gelatcht en de download faalt stil.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
      setDownloaded(true);
    } catch (e) {
      setGateError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setGateBusy(false);
    }
  }, [result, email]);

  const copyRecipe = useCallback((idx: number, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }, []);

  return (
    <div className="mkt-hero-glow">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Hero (touchpoint 0.1) */}
        <div className="text-center">
          <p className="mkt-accent text-sm font-semibold uppercase tracking-wide">
            Free · built on the open brand.md standard
          </p>
          <h1 className="mt-4">Give every AI agent your brand memory.</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
            Paste your URL. Get your brand.md — the open file that keeps ChatGPT, Claude, Cursor
            and every AI tool on-brand.
          </p>
        </div>

        {/* Input */}
        {phase !== 'done' && (
          <div className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && phase !== 'scanning' && generate()}
              placeholder="yourbrand.com"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none"
              disabled={phase === 'scanning'}
            />
            <button
              onClick={generate}
              disabled={phase === 'scanning' || !url.trim()}
              className="mkt-btn-primary flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-3 font-semibold disabled:opacity-50"
            >
              {phase === 'scanning' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              Generate my brand.md
            </button>
          </div>
        )}

        {/* Scan-progress (touchpoint 1.1 — labor illusion) */}
        {phase === 'scanning' && (
          <div className="mx-auto mt-10 max-w-xl space-y-2">
            {PROGRESS_LINES.slice(0, progressIdx + 1).map((line, i) => (
              <div
                key={line}
                className={`flex items-center gap-3 text-sm ${i === progressIdx ? 'text-gray-900' : 'text-gray-500'}`}
              >
                {i === progressIdx ? (
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: ACCENT_INK }} />
                ) : (
                  <Check className="h-4 w-4" style={{ color: ACCENT_INK }} />
                )}
                {line}
              </div>
            ))}
          </div>
        )}

        {phase === 'error' && (
          <div className="mx-auto mt-8 max-w-xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Resultaat — leken-laag eerst (feedback 2026-08-14) */}
        {phase === 'done' && result && (
          <div className="mt-12">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="text-center">
                <h2>How AI-ready is {result.domain}?</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm text-gray-600">
                  This score shows how well AI tools like ChatGPT and Claude can play your brand —
                  based on what your website alone reveals.
                </p>
                <p className="mt-5 text-6xl font-bold" style={{ color: ACCENT_INK }}>
                  {result.score}
                  <span className="text-2xl text-gray-400">/100</span>
                </p>
                <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Brand Score
                </p>
              </div>

              {/* Hoofdbevindingen in gewone taal */}
              <div className="mt-7 space-y-2.5">
                {result.findings.map((f) => (
                  <div key={f.text} className="flex items-start gap-3 text-sm">
                    {f.positive ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT_INK }} />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    )}
                    <span className="text-gray-700">{f.text}</span>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-xs text-gray-500">
                Scanned: {result.scannedPaths.join(', ')} · {result.validatedSections} of{' '}
                {result.totalSections} sections could be verified from your site alone — the open
                fields are why the score isn&apos;t higher yet.
              </p>

              {/* Scoredimensies — ingeklapt, voor wie het wil weten */}
              <details className="mt-4 rounded-lg border border-gray-200">
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600">
                  <ChevronDown className="h-4 w-4" /> How we scored this
                </summary>
                <div className="grid gap-3 p-4 pt-1 sm:grid-cols-3">
                  {result.dimensions.map((d) => (
                    <div key={d.key} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        {d.label} · {Math.round(d.weight * 100)}%
                      </p>
                      <p className="text-xl font-semibold text-gray-900">{d.score}</p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-600">
                        {d.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            </div>

            {/* Wat kun je ermee — zichtbaar vóór de download (use-teaser) */}
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2">
                <FileText className="h-5 w-5" style={{ color: ACCENT_INK }} />
                What can you do with your brand.md?
              </h3>
              <div className="mt-4 space-y-3">
                {USE_RECIPES.map((r, i) => (
                  <div
                    key={r.tool}
                    className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: ACCENT_INK }}>
                        {r.tool}
                      </p>
                      <p className="text-sm text-gray-600">{r.recipe}</p>
                    </div>
                    {r.copyText && downloaded && (
                      <button
                        onClick={() => copyRecipe(i, r.copyText!)}
                        className="flex shrink-0 items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        {copiedIdx === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedIdx === i ? 'Copied' : 'Copy prompt'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Full walkthroughs:{' '}
                <a href="/brandmd/use" className="mkt-accent underline underline-offset-2">
                  branddock.app/brandmd/use
                </a>
              </p>
            </div>

            {/* Download-gate (hard, user-besluit 2026-08-14) */}
            <div
              className={`mt-6 rounded-2xl border bg-gray-50 p-6 ${downloaded ? '' : 'border-gray-200'}`}
              style={downloaded ? { borderColor: 'var(--primary)' } : undefined}
            >
              {downloaded ? (
                <div className="text-center">
                  <Check className="mx-auto h-8 w-8" style={{ color: ACCENT_INK }} />
                  <h3 className="mt-2">Your brand.md is downloading</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Your full report is on its way to your inbox. Try the recipes above — and
                    when you want the living, validated version:
                  </p>
                  {result.claimUrl && (
                    <a
                      href={result.claimUrl}
                      className="mkt-btn-primary mt-4 inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold"
                    >
                      Claim &amp; complete your brand <ArrowRight className="h-5 w-5" />
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <h3 className="flex items-center gap-2">
                    <Download className="h-5 w-5" style={{ color: ACCENT_INK }} />
                    Download your brand.md
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Free — leave your email and your file downloads instantly. We&apos;ll also
                    email you this full report with your download link, so you can pick it up on
                    any device. One email, no newsletter, no spam.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !gateBusy && unlockAndDownload()}
                      placeholder="you@company.com"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none"
                    />
                    <button
                      onClick={unlockAndDownload}
                      disabled={gateBusy || !email.trim()}
                      className="mkt-btn-primary flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
                    >
                      {gateBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Download — free
                    </button>
                  </div>
                  {gateError && <p className="mt-3 text-sm text-red-600">{gateError}</p>}
                </>
              )}
            </div>

            <p className="mt-8 text-center text-xs text-gray-500">
              Built on the open{' '}
              <a href="https://thebrand.md" className="underline underline-offset-2" rel="noopener">
                brand.md standard
              </a>{' '}
              (v0.2 core) · fields we couldn&apos;t verify are marked <code>unvalidated</code> —
              we&apos;d rather ship an honest file than an impressive one.
            </p>
          </div>
        )}

        {phase === 'idle' && (
          <p className="mt-10 text-center text-sm text-gray-500">
            Works with: Claude · ChatGPT · Cursor · n8n ·{' '}
            <a href="/brandmd/use" className="mkt-accent underline underline-offset-2">
              how to use a brand.md
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
