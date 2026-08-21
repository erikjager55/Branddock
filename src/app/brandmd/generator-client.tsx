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
  'Je site lezen…',
  'Zoeken naar je over-ons- en dienstenpagina\'s…',
  'Je kleursysteem uitlezen…',
  'Luisteren naar je tone-of-voice…',
  'Nagaan wat we niet kunnen bevestigen, en dat eerlijk markeren',
  'Je brand.md bouwen…',
];

const USE_RECIPES: Array<{ tool: string; recipe: string; copyText?: string }> = [
  {
    tool: 'Claude',
    recipe: 'Maak een Project → sleep brand.md erin → elke chat is on-brand.',
    copyText:
      'Gebruik de bijgevoegde brand.md als enige bron van waarheid voor dit merk. Volg de stem, guardrails en doelgroep in alles wat je schrijft.',
  },
  {
    tool: 'ChatGPT',
    recipe: 'Instellingen → Aangepaste instructies → plak de Voice-sectie.',
  },
  {
    tool: 'Cursor / coding-agents',
    recipe: 'Zet BRAND.md in de root van je repo, naast AGENTS.md. Klaar.',
  },
  {
    tool: 'Any AI chat',
    recipe: 'Plak het hele bestand boven je prompt. Het is maar zo\'n twee pagina\'s.',
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
  // Default UIT: de reeks 2.2-2.4 is marketing, dus expliciete toestemming.
  // De download zelf en de TTL-melding hangen hier niet van af.
  const [lifecycleOptIn, setLifecycleOptIn] = useState(false);
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
        body: JSON.stringify({
          token: result.token,
          event: 'email',
          email: email.trim(),
          lifecycleOptIn,
        }),
      });
      if (!track.ok) {
        const data = (await track.json()) as { error?: string };
        throw new Error(data.error ?? 'Je e-mailadres kon niet worden opgeslagen');
      }
      const res = await fetch(`/api/brandmd/download?token=${encodeURIComponent(result.token)}`);
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Downloaden mislukt');
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
      setGateError(e instanceof Error ? e.message : 'Er ging iets mis');
    } finally {
      setGateBusy(false);
    }
  }, [result, email, lifecycleOptIn]);

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
            Gratis · gebouwd op de open brand.md-standaard
          </p>
          <h1 className="mt-4">Geef elke AI-agent het geheugen van je merk.</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
            Plak je URL. Je krijgt je brand.md: het open bestand dat ChatGPT, Claude, Cursor en
            elke andere AI-tool on-brand houdt.
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
              placeholder="jouwmerk.nl"
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
              Genereer mijn brand.md
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
                <h2>Hoe AI-klaar is {result.domain}?</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm text-gray-600">
                  Deze score laat zien hoe goed AI-tools als ChatGPT en Claude jouw merk kunnen
                  spelen, op basis van wat je website alleen al prijsgeeft.
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
                Gescand: {result.scannedPaths.join(', ')} · {result.validatedSections} van{' '}
                {result.totalSections} secties konden we bevestigen op basis van je site alleen;
                de openstaande velden zijn de reden dat de score nog niet hoger is.
              </p>

              {/* Scoredimensies — ingeklapt, voor wie het wil weten */}
              <details className="mt-4 rounded-lg border border-gray-200">
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600">
                  <ChevronDown className="h-4 w-4" /> Zo kwamen we aan deze score
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
                Wat kun je met je brand.md?
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
                        {copiedIdx === i ? 'Gekopieerd' : 'Kopieer prompt'}
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
                  <h3 className="mt-2">Je brand.md wordt gedownload</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Je volledige rapport is onderweg naar je inbox. Probeer de recepten
                    hierboven uit. En wil je de levende, bevestigde versie:
                  </p>
                  {result.claimUrl && (
                    <a
                      href={result.claimUrl}
                      className="mkt-btn-primary mt-4 inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold"
                    >
                      Claim je merk en maak het af <ArrowRight className="h-5 w-5" />
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <h3 className="flex items-center gap-2">
                    <Download className="h-5 w-5" style={{ color: ACCENT_INK }} />
                    Download je brand.md
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Gratis. Laat je e-mailadres achter en je bestand wordt meteen gedownload.
                    We mailen je dit volledige rapport ook toe, mét je downloadlink, zodat je het
                    op elk apparaat kunt oppakken. Geen nieuwsbrief, alleen één herinnering
                    voordat je concept verloopt.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !gateBusy && unlockAndDownload()}
                      placeholder="jij@bedrijf.nl"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none"
                    />
                    <button
                      onClick={unlockAndDownload}
                      disabled={gateBusy || !email.trim()}
                      className="mkt-btn-primary flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
                    >
                      {gateBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Gratis downloaden
                    </button>
                  </div>
                  <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={lifecycleOptIn}
                      onChange={(e) => setLifecycleOptIn(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <span>
                      Stuur me ook 3 korte tips om meer uit mijn brand.md te halen, ongeveer
                      één per week. Uitschrijven kan altijd, met één klik.
                    </span>
                  </label>
                  {gateError && <p className="mt-3 text-sm text-red-600">{gateError}</p>}
                </>
              )}
            </div>

            <p className="mt-8 text-center text-xs text-gray-500">
              Gebouwd op de open{' '}
              <a href="https://thebrand.md" className="underline underline-offset-2" rel="noopener">
                brand.md-standaard
              </a>{' '}
              (spec v0.3) · velden die we niet konden bevestigen staan gemarkeerd als{' '}
              <code>unvalidated</code>. We leveren liever een eerlijk bestand dan een
              indrukwekkend bestand.
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
