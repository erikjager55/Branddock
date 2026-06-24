'use client';

import { Sparkles, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useCanvasComponents } from '../../hooks/canvas.hooks';
import {
  buildGeoPanelViewModel,
  isRenderableGeoAnalysis,
  type GeoZone,
} from '@/lib/landing-pages/geo-panel-view';

// Tailwind 4 purge — inline hexes voor de dynamische zone-kleuren (zie
// VisualFidelityBadge): class-namen met een variabele kleur worden weggepurged.
const ZONE_HEX: Record<GeoZone, string> = {
  good: '#10b981', // emerald-500  ≥70
  warn: '#f59e0b', // amber-500    50-69
  bad: '#ef4444', // red-500      <50
};
const ZONE_LABEL: Record<GeoZone, string> = {
  good: 'GEO-geoptimaliseerd',
  warn: 'Kan beter',
  bad: 'Onder doel',
};

interface GeoOptimizationPanelProps {
  deliverableId: string;
}

/**
 * GEO-meet-paneel — toont de gepersisteerde `geoOptimizationAnalysis` van een
 * gepubliceerd long-form GEO-artikel: composietscore + 5 signalen + findings +
 * geëmitte schema-types + freshness. Paneel-only: de F-VAL GEO-pijler in de
 * publish-gate blijft bewust dormant (geen drempel-impact).
 *
 * Rendert niets tot er een analyse is (= na de eerste publish) en is fail-soft:
 * bij een query-fout valt het stil terug op `null` — het is een secundaire
 * surface; de canvas toont de primaire loading/error-states zelf. Spiegelt het
 * VisualFidelityBadge-contract (geen data → render niets).
 */
export function GeoOptimizationPanel({ deliverableId }: GeoOptimizationPanelProps) {
  const { data } = useCanvasComponents(deliverableId);
  const analysis = data?.geoOptimizationAnalysis;
  // Guard tegen ruwe/corrupte persisted JSON (zie isRenderableGeoAnalysis):
  // geen analyse of een misvormd object → render niets i.p.v. crashen.
  if (!isRenderableGeoAnalysis(analysis)) return null;

  const vm = buildGeoPanelViewModel(analysis, new Date());
  const hex = ZONE_HEX[vm.zone];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Header: score + zone + freshness */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <Sparkles className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold leading-none" style={{ color: hex }}>
            {vm.score}
          </span>
          <span className="text-xs font-medium" style={{ color: hex }}>
            {ZONE_LABEL[vm.zone]}
          </span>
        </div>
        <span className="text-xs text-gray-400">AI-citeerbaarheid (GEO)</span>
        <div className="flex-1" />
        {vm.stale && (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
            <Clock className="w-3 h-3" /> 90+ dagen oud
          </span>
        )}
      </div>

      {/* Geëmitte schema.org-types */}
      {vm.schemaTypes.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-2">
          {vm.schemaTypes.map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Signaal-breakdown */}
      <div className="pt-3 space-y-1.5">
        {vm.signals.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-xs">
            <span className="w-32 shrink-0 text-gray-600">{s.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${s.score}%`, backgroundColor: s.weak ? ZONE_HEX.warn : ZONE_HEX.good }}
              />
            </div>
            <span className="w-8 text-right tabular-nums text-gray-700">{s.score}</span>
          </div>
        ))}
      </div>

      {/* Findings (verbeterpunten) */}
      {vm.findings.length > 0 ? (
        <div className="mt-1 space-y-1.5 border-t border-gray-100 pt-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Verbeterpunten ({vm.findings.length})
          </div>
          {vm.findings.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="break-words">{f}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-1 flex items-center gap-1.5 border-t border-gray-100 pt-3 text-xs text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> Alle GEO-signalen op orde
        </div>
      )}
    </div>
  );
}
