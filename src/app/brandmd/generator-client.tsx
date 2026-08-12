'use client';

// =============================================================
// brand.md generator — publieke client-UI
//
// Touchpoints v2: scan-progress als vertelmoment (labor illusion,
// 1.1), Brand Score groot met CTA-hiërarchie (1.2), use-paneel
// direct na download (1.6), rapport-laag achter e-mail (gate-
// architectuur), claim-CTA (§4b). Copy conform
// docs/marketing/brand-md-touchpoint-content-2026-08-03.md.
// =============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Copy, Download, FileText, Loader2, Mail, Sparkles } from 'lucide-react';

const PRIMARY = '#1FD1B2';

interface ScoreDimension {
  key: string;
  label: string;
  score: number;
  weight: number;
  explanation: string;
}

interface GenerateResult {
  token: string;
  brandName: string;
  domain: string;
  file: string;
  fileName: string;
  score: number;
  dimensions: ScoreDimension[];
  validatedSections: number;
  totalSections: number;
  claimUrl: string | null;
  expiresAt: string;
}

const PROGRESS_LINES = [
  'Reading your site…',
  'Extracting your color system…',
  'Listening to your tone of voice…',
  'Recognizing your positioning…',
  "Checking what we can't verify — we'll mark it honestly",
  'Building your brand.md…',
];

const USE_RECIPES: Array<{ tool: string; recipe: string; copyText?: string }> = [
  {
    tool: 'Claude',
    recipe: 'Create a Project → drag brand.md in → every chat is on-brand.',
    copyText: 'Use the attached brand.md as the single source of truth for this brand. Follow its voice, guardrails and audience in everything you write.',
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
  const [downloaded, setDownloaded] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
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
    setEmailSent(false);
    setProgressIdx(0);
    progressTimer.current = setInterval(() => {
      setProgressIdx((i) => Math.min(i + 1, PROGRESS_LINES.length - 1));
    }, 4000);
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

  const download = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.file], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    const blobUrl = URL.createObjectURL(blob);
    a.href = blobUrl;
    a.download = result.fileName;
    a.click();
    // Niet synchroon revoken: Firefox/Safari hebben de blob-URL dan soms nog
    // niet gelatcht en de download faalt stil.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
    setDownloaded(true);
    void fetch('/api/brandmd/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: result.token, event: 'downloaded' }),
    });
  }, [result]);

  const submitEmail = useCallback(async () => {
    if (!result || !email.trim()) return;
    const res = await fetch('/api/brandmd/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: result.token, event: 'email', email: email.trim() }),
    });
    if (res.ok) setEmailSent(true);
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
            Free · no account · built on the open brand.md standard
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
              <div key={line} className="flex items-center gap-3 text-sm" style={{ color: i === progressIdx ? '#E7ECF2' : '#5E7189' }}>
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
          <div className="mx-auto mt-8 max-w-xl rounded-lg border p-4 text-sm" style={{ borderColor: '#7A2E2E', backgroundColor: '#2A1518', color: '#F0B9B9' }}>
            {error}
          </div>
        )}

        {/* Resultaat (touchpoint 1.2) */}
        {phase === 'done' && result && (
          <div className="mt-12">
            <div className="rounded-2xl border p-8 text-center" style={{ backgroundColor: '#111B2E', borderColor: '#26354D' }}>
              <p className="text-sm" style={{ color: '#9FB0C3' }}>{result.domain}</p>
              <p className="mt-2 text-6xl font-bold" style={{ color: PRIMARY }}>
                {result.score}
                <span className="text-2xl" style={{ color: '#5E7189' }}>/100</span>
              </p>
              <p className="mt-1 text-sm font-medium uppercase tracking-wide" style={{ color: '#9FB0C3' }}>
                Brand Score
              </p>
              <p className="mt-4 text-sm" style={{ color: '#9FB0C3' }}>
                {result.validatedSections} of {result.totalSections} sections could be verified from
                your site alone — the open fields are why it&apos;s not higher yet.
              </p>

              {/* Score-uitleg — het cijfer is nooit een black box */}
              <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
                {result.dimensions.map((d) => (
                  <div key={d.key} className="rounded-lg border p-3" style={{ borderColor: '#26354D' }}>
                    <p className="text-xs uppercase tracking-wide" style={{ color: '#5E7189' }}>
                      {d.label} · {Math.round(d.weight * 100)}%
                    </p>
                    <p className="text-xl font-semibold">{d.score}</p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: '#9FB0C3' }}>{d.explanation}</p>
                  </div>
                ))}
              </div>

              {/* CTA-hiërarchie: ①download ②rapport/e-mail ③claim */}
              <div className="mt-8 flex flex-col items-center gap-3">
                <button
                  onClick={download}
                  className="flex items-center gap-2 rounded-lg px-6 py-3 text-base font-semibold"
                  style={{ backgroundColor: PRIMARY, color: '#06251F' }}
                >
                  <Download className="h-5 w-5" /> Download your brand.md — free
                </button>
                {result.claimUrl && (
                  <a
                    href={result.claimUrl}
                    className="flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
                    style={{ color: PRIMARY }}
                  >
                    Claim &amp; complete your brand — the living, validated version
                    <ArrowRight className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Use-it-moment (touchpoint 1.6 — Fogg ability) */}
            {downloaded && (
              <div className="mt-6 rounded-2xl border p-6" style={{ backgroundColor: '#111B2E', borderColor: '#26354D' }}>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <FileText className="h-5 w-5" style={{ color: PRIMARY }} />
                  Your file is downloading. Here&apos;s the 30-second version:
                </h2>
                <div className="mt-4 space-y-3">
                  {USE_RECIPES.map((r, i) => (
                    <div key={r.tool} className="flex items-start justify-between gap-3 rounded-lg border p-3" style={{ borderColor: '#26354D' }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: PRIMARY }}>{r.tool}</p>
                        <p className="text-sm" style={{ color: '#9FB0C3' }}>{r.recipe}</p>
                      </div>
                      {r.copyText && (
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
                <p className="mt-4 text-xs" style={{ color: '#5E7189' }}>
                  Full walkthroughs with 30-sec clips:{' '}
                  <a href="/brandmd/use" className="underline underline-offset-2" style={{ color: PRIMARY }}>
                    branddock.app/brandmd/use
                  </a>
                </p>
              </div>
            )}

            {/* Rapport-laag achter e-mail (gate-architectuur, partial reveal) */}
            <div className="mt-6 rounded-2xl border p-6" style={{ backgroundColor: '#111B2E', borderColor: '#26354D' }}>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Mail className="h-5 w-5" style={{ color: PRIMARY }} />
                Want the full report?
              </h2>
              <p className="mt-1 text-sm" style={{ color: '#9FB0C3' }}>
                Per-field breakdown, what we couldn&apos;t verify and how to fix it — plus your file
                in your inbox.
              </p>
              {emailSent ? (
                <p className="mt-3 flex items-center gap-2 text-sm" style={{ color: PRIMARY }}>
                  <Check className="h-4 w-4" /> On its way. One email, no drip-feed surprises.
                </p>
              ) : (
                <div className="mt-3 flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: '#0B1220', borderColor: '#26354D', color: '#E7ECF2' }}
                  />
                  <button
                    onClick={submitEmail}
                    className="whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium"
                    style={{ borderColor: PRIMARY, color: PRIMARY }}
                  >
                    Email me the report
                  </button>
                </div>
              )}
            </div>

            <p className="mt-8 text-center text-xs" style={{ color: '#5E7189' }}>
              Built on the open{' '}
              <a href="https://thebrand.md" className="underline underline-offset-2" rel="noopener">
                brand.md standard
              </a>{' '}
              (v0.2 core) · fields we couldn&apos;t verify are marked <code>unvalidated</code> — we&apos;d
              rather ship an honest file than an impressive one.
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
