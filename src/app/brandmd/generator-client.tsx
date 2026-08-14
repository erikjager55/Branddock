'use client';

// =============================================================
// brand.md generator — publieke client-UI
//
// v2 (feedback 2026-08-14): leken-laag op de resultaatpagina
// (uitlegzin + hoofdbevindingen in gewone taal; scoredimensies
// ingeklapt als "How we scored this"), use-paneel zichtbaar vóór
// download, en een HARDE e-mail-gate (user-besluit): downloaden
// kan pas na e-mail — server-side afgedwongen via
// /api/brandmd/download. Copy belooft géén rapport-mail zolang
// de mail-verzending (follow-up-task) niet bestaat.
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

const PRIMARY = '#1FD1B2';

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
    <main className="min-h-screen" style={{ backgroundColor: '#0B1220', color: '#E7ECF2' }}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Hero (touchpoint 0.1) */}
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wide" style={{ color: PRIMARY }}>
            Free · built on the open brand.md standard
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            Give every AI agent your brand memory.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg" style={{ color: '#9FB0C3' }}>
            Paste your URL. Get your brand.md — the open file that keeps ChatGPT, Claude, Cursor
            and every AI tool on-brand.
          </p>
        </div>

        {/* Input */}
        {phase !== 'done' && (
          <div className="mx-auto mt-10 flex max-w-xl gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && phase !== 'scanning' && generate()}
              placeholder="yourbrand.com"
              className="w-full rounded-lg border px-4 py-3 text-base outline-none"
              style={{ backgroundColor: '#111B2E', borderColor: '#26354D', color: '#E7ECF2' }}
              disabled={phase === 'scanning'}
            />
            <button
              onClick={generate}
              disabled={phase === 'scanning' || !url.trim()}
              className="flex items-center gap-2 whitespace-nowrap rounded-lg px-5 py-3 font-semibold disabled:opacity-50"
              style={{ backgroundColor: PRIMARY, color: '#06251F' }}
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
                className="flex items-center gap-3 text-sm"
                style={{ color: i === progressIdx ? '#E7ECF2' : '#5E7189' }}
              >
                {i === progressIdx ? (
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: PRIMARY }} />
                ) : (
                  <Check className="h-4 w-4" style={{ color: PRIMARY }} />
                )}
                {line}
              </div>
            ))}
          </div>
        )}

        {phase === 'error' && (
          <div
            className="mx-auto mt-8 max-w-xl rounded-lg border p-4 text-sm"
            style={{ borderColor: '#7A2E2E', backgroundColor: '#2A1518', color: '#F0B9B9' }}
          >
            {error}
          </div>
        )}

        {/* Resultaat — leken-laag eerst (feedback 2026-08-14) */}
        {phase === 'done' && result && (
          <div className="mt-12">
            <div
              className="rounded-2xl border p-8"
              style={{ backgroundColor: '#111B2E', borderColor: '#26354D' }}
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold">How AI-ready is {result.domain}?</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm" style={{ color: '#9FB0C3' }}>
                  This score shows how well AI tools like ChatGPT and Claude can play your brand —
                  based on what your website alone reveals.
                </p>
                <p className="mt-5 text-6xl font-bold" style={{ color: PRIMARY }}>
                  {result.score}
                  <span className="text-2xl" style={{ color: '#5E7189' }}>/100</span>
                </p>
                <p className="mt-1 text-sm font-medium uppercase tracking-wide" style={{ color: '#9FB0C3' }}>
                  Brand Score
                </p>
              </div>

              {/* Hoofdbevindingen in gewone taal */}
              <div className="mt-7 space-y-2.5">
                {result.findings.map((f) => (
                  <div key={f.text} className="flex items-start gap-3 text-sm">
                    {f.positive ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: PRIMARY }} />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#E8A13C' }} />
                    )}
                    <span style={{ color: '#C7D2DF' }}>{f.text}</span>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-xs" style={{ color: '#5E7189' }}>
                Scanned: {result.scannedPaths.join(', ')} · {result.validatedSections} of{' '}
                {result.totalSections} sections could be verified from your site alone — the open
                fields are why the score isn&apos;t higher yet.
              </p>

              {/* Scoredimensies — ingeklapt, voor wie het wil weten */}
              <details className="mt-4 rounded-lg border" style={{ borderColor: '#26354D' }}>
                <summary
                  className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-medium"
                  style={{ color: '#9FB0C3' }}
                >
                  <ChevronDown className="h-4 w-4" /> How we scored this
                </summary>
                <div className="grid gap-3 p-4 pt-1 sm:grid-cols-3">
                  {result.dimensions.map((d) => (
                    <div key={d.key} className="rounded-lg border p-3" style={{ borderColor: '#26354D' }}>
                      <p className="text-xs uppercase tracking-wide" style={{ color: '#5E7189' }}>
                        {d.label} · {Math.round(d.weight * 100)}%
                      </p>
                      <p className="text-xl font-semibold">{d.score}</p>
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: '#9FB0C3' }}>
                        {d.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            </div>

            {/* Wat kun je ermee — zichtbaar vóór de download (use-teaser) */}
            <div
              className="mt-6 rounded-2xl border p-6"
              style={{ backgroundColor: '#111B2E', borderColor: '#26354D' }}
            >
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <FileText className="h-5 w-5" style={{ color: PRIMARY }} />
                What can you do with your brand.md?
              </h3>
              <div className="mt-4 space-y-3">
                {USE_RECIPES.map((r, i) => (
                  <div
                    key={r.tool}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3"
                    style={{ borderColor: '#26354D' }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: PRIMARY }}>{r.tool}</p>
                      <p className="text-sm" style={{ color: '#9FB0C3' }}>{r.recipe}</p>
                    </div>
                    {r.copyText && downloaded && (
                      <button
                        onClick={() => copyRecipe(i, r.copyText!)}
                        className="flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs"
                        style={{ borderColor: '#26354D', color: '#9FB0C3' }}
                      >
                        {copiedIdx === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedIdx === i ? 'Copied' : 'Copy prompt'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs" style={{ color: '#5E7189' }}>
                Full walkthroughs:{' '}
                <a href="/brandmd/use" className="underline underline-offset-2" style={{ color: PRIMARY }}>
                  branddock.app/brandmd/use
                </a>
              </p>
            </div>

            {/* Download-gate (hard, user-besluit 2026-08-14) */}
            <div
              className="mt-6 rounded-2xl border p-6"
              style={{ backgroundColor: '#111B2E', borderColor: downloaded ? PRIMARY : '#26354D' }}
            >
              {downloaded ? (
                <div className="text-center">
                  <Check className="mx-auto h-8 w-8" style={{ color: PRIMARY }} />
                  <h3 className="mt-2 text-lg font-semibold">Your brand.md is downloading</h3>
                  <p className="mt-1 text-sm" style={{ color: '#9FB0C3' }}>
                    Try the recipes above — and when you want the living, validated version:
                  </p>
                  {result.claimUrl && (
                    <a
                      href={result.claimUrl}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold"
                      style={{ backgroundColor: PRIMARY, color: '#06251F' }}
                    >
                      Claim &amp; complete your brand <ArrowRight className="h-5 w-5" />
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Download className="h-5 w-5" style={{ color: PRIMARY }} />
                    Download your brand.md
                  </h3>
                  <p className="mt-1 text-sm" style={{ color: '#9FB0C3' }}>
                    Free — leave your email and your file downloads instantly. Your claim link
                    stays tied to this address, so only you can turn this draft into a workspace.
                    No newsletter, no spam.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !gateBusy && unlockAndDownload()}
                      placeholder="you@company.com"
                      className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                      style={{ backgroundColor: '#0B1220', borderColor: '#26354D', color: '#E7ECF2' }}
                    />
                    <button
                      onClick={unlockAndDownload}
                      disabled={gateBusy || !email.trim()}
                      className="flex items-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
                      style={{ backgroundColor: PRIMARY, color: '#06251F' }}
                    >
                      {gateBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Download — free
                    </button>
                  </div>
                  {gateError && (
                    <p className="mt-3 text-sm" style={{ color: '#F0B9B9' }}>{gateError}</p>
                  )}
                </>
              )}
            </div>

            <p className="mt-8 text-center text-xs" style={{ color: '#5E7189' }}>
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
          <p className="mt-10 text-center text-sm" style={{ color: '#5E7189' }}>
            Works with: Claude · ChatGPT · Cursor · n8n ·{' '}
            <a href="/brandmd/use" className="underline underline-offset-2">how to use a brand.md</a>
          </p>
        )}
      </div>
    </main>
  );
}
