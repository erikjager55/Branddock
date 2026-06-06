'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  summarizeProvenance,
  type TokenProvenance,
  type TokenSource,
} from '@/lib/landing-pages/token-provenance';

/**
 * V3 (governed-token-layer) — developer-only provenance-footer op de LP-render.
 *
 * Toont per kern-token waar de gerenderde waarde vandaan komt (scraped/logo/
 * preset/fallback/derived) + confidence + bewijs. Maakt GIGO debugbaar VÓÓR
 * de gebruiker een slechte LP accepteert: napking (WordPress-placeholder) toont
 * overwegend `fallback`, een sterke brand overwegend `scraped`.
 *
 * Presentational — de developer-gate zit op de call-site (useDeveloperAccess).
 */

const SOURCE_STYLE: Record<TokenSource, { label: string; cls: string }> = {
  scraped: { label: 'scraped', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  logo: { label: 'logo', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  override: { label: 'override', cls: 'text-sky-700 bg-sky-50 border-sky-200' },
  archetype: { label: 'archetype', cls: 'text-violet-700 bg-violet-50 border-violet-200' },
  preset: { label: 'preset', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  derived: { label: 'derived', cls: 'text-gray-600 bg-gray-50 border-gray-200' },
  fallback: { label: 'fallback', cls: 'text-red-700 bg-red-50 border-red-200' },
};

export function TokenProvenancePanel({ provenance }: { provenance: TokenProvenance | undefined }) {
  const [open, setOpen] = useState(false);
  const summary = useMemo(
    () => (provenance ? summarizeProvenance(provenance) : null),
    [provenance],
  );

  if (!provenance || !summary || summary.total === 0) return null;

  const healthy = summary.fallback === 0 && summary.lowConfidence === 0;
  const paths = Object.keys(provenance).sort();

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {healthy ? (
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
        )}
        <span className="font-medium text-gray-700">Token-provenance</span>
        <span className="text-gray-500">
          {summary.scraped} scraped · {summary.fallback} fallback · {summary.lowConfidence} low-conf
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400">dev</span>
      </button>
      {open && (
        <div className="border-t border-gray-200 px-3 py-2 max-h-64 overflow-auto">
          <table className="w-full">
            <tbody>
              {paths.map((path) => {
                const o = provenance[path];
                const style = SOURCE_STYLE[o.source];
                return (
                  <tr key={path} className="align-top">
                    <td className="py-0.5 pr-2 font-mono text-gray-700 whitespace-nowrap">{path}</td>
                    <td className="py-0.5 pr-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded border ${style.cls}`}>
                        {style.label}
                      </span>
                    </td>
                    <td className="py-0.5 pr-2 text-gray-500 whitespace-nowrap">{o.confidence}</td>
                    <td className="py-0.5 text-gray-500">{o.evidence ?? o.detector ?? ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
