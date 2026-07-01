'use client';

import { Image as ImageIcon, ShieldCheck, AlertTriangle, AlertCircle, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, EmptyState } from '@/components/shared';
import { useVisualFidelityDashboard } from '@/features/settings/hooks/use-visual-fidelity';
import { useFormat } from '@/lib/ui-i18n/format';

const ZONE_HEX = {
  good: '#10b981',
  warn: '#f59e0b',
  bad: '#ef4444',
} as const;

/**
 * Workspace G8 visual fidelity dashboard — aggregate scores across all
 * generated images. Mirrors the prompt-registry dashboard pattern.
 *
 * Settings → Developer → Visual Fidelity.
 */
export function VisualFidelityDashboardTab() {
  const { t } = useTranslation('settings-misc');
  const { formatNumber, formatDate } = useFormat();
  const { data, isLoading, error } = useVisualFidelityDashboard();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        {t('visualFidelity.loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={AlertCircle}
          title={t('visualFidelity.loadFailedTitle')}
          description={error instanceof Error ? error.message : t('visualFidelity.unknownError')}
        />
      </div>
    );
  }

  if (!data) return null;

  const { totals, distribution, averageColorAlignment, dimensions, topLowScores } = data;
  const totalDist = distribution.good + distribution.warn + distribution.bad;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <header className="px-8 pt-6 pb-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{t('visualFidelity.heading')}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {t('visualFidelity.description')}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* ── KPI tiles ──────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile
            icon={<ImageIcon className="h-4 w-4 text-teal-600" />}
            label={t('visualFidelity.kpi.scored24h')}
            value={formatNumber(totals.count24h)}
            sub={t('visualFidelity.kpi.scored24hSub', { count: formatNumber(totals.count7d) })}
          />
          <KpiTile
            icon={<ImageIcon className="h-4 w-4 text-blue-600" />}
            label={t('visualFidelity.kpi.scored30d')}
            value={formatNumber(totals.count30d)}
            sub={t('visualFidelity.kpi.scored30dSub', { count: formatNumber(totals.countAllTime) })}
          />
          <KpiTile
            icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
            label={t('visualFidelity.kpi.avgComposite')}
            value={totals.avg30d.toFixed(1)}
            sub={t('visualFidelity.kpi.avgCompositeSub', { h24: totals.avg24h.toFixed(1), d7: totals.avg7d.toFixed(1) })}
          />
          <KpiTile
            icon={<Palette className="h-4 w-4 text-violet-600" />}
            label={t('visualFidelity.kpi.avgColorMatch')}
            value={averageColorAlignment.toFixed(1)}
            sub={t('visualFidelity.kpi.avgColorMatchSub')}
          />
        </div>

        {totals.count30d === 0 ? (
          <Card>
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              {t('visualFidelity.empty')}
            </div>
          </Card>
        ) : (
          <>
            {/* ── Threshold-met rate ─────────────────────────── */}
            <Card>
              <Card.Header>
                <h4 className="text-sm font-medium text-gray-900">
                  {t('visualFidelity.thresholdRate')}
                </h4>
              </Card.Header>
              <Card.Body>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <RatePill label="24h" rate={totals.metRate24h} count={totals.count24h} />
                  <RatePill label="7d" rate={totals.metRate7d} count={totals.count7d} />
                  <RatePill label="30d" rate={totals.metRate30d} count={totals.count30d} />
                </div>
              </Card.Body>
            </Card>

            {/* ── Distribution ───────────────────────────────── */}
            <Card>
              <Card.Header>
                <h4 className="text-sm font-medium text-gray-900">
                  {t('visualFidelity.scoreDistribution')}
                </h4>
              </Card.Header>
              <Card.Body>
                <DistBar
                  good={distribution.good}
                  warn={distribution.warn}
                  bad={distribution.bad}
                  total={totalDist}
                />
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <DistLegend
                    color={ZONE_HEX.good}
                    label={t('visualFidelity.dist.onBrand')}
                    count={distribution.good}
                    total={totalDist}
                  />
                  <DistLegend
                    color={ZONE_HEX.warn}
                    label={t('visualFidelity.dist.offTarget')}
                    count={distribution.warn}
                    total={totalDist}
                  />
                  <DistLegend
                    color={ZONE_HEX.bad}
                    label={t('visualFidelity.dist.offBrand')}
                    count={distribution.bad}
                    total={totalDist}
                  />
                </div>
              </Card.Body>
            </Card>

            {/* ── Dimensions ─────────────────────────────────── */}
            {dimensions.length > 0 && (
              <Card>
                <Card.Header>
                  <h4 className="text-sm font-medium text-gray-900">
                    {t('visualFidelity.judgeDimensions')}
                  </h4>
                </Card.Header>
                <Card.Body>
                  <div className="space-y-1.5">
                    {dimensions.map((d) => (
                      <div
                        key={d.key}
                        className="flex items-center gap-3 text-sm py-1.5 border-b border-gray-100 last:border-0"
                      >
                        <span className="font-medium text-gray-900 capitalize w-44">
                          {d.key.replace(/-/g, ' ')}
                        </span>
                        <span className="text-gray-700 tabular-nums w-20 text-right">
                          {t('visualFidelity.dimensions.avg', { score: d.averageScore.toFixed(1) })}
                        </span>
                        <span
                          className="text-xs tabular-nums w-28 text-right"
                          style={{
                            color:
                              d.flaggedRate >= 30
                                ? ZONE_HEX.bad
                                : d.flaggedRate >= 10
                                  ? ZONE_HEX.warn
                                  : ZONE_HEX.good,
                          }}
                        >
                          {t('visualFidelity.dimensions.flagged', { count: d.flaggedCount, rate: d.flaggedRate.toFixed(1) })}
                        </span>
                        <span className="text-xs text-gray-400 w-20 text-right">
                          n={d.sampleSize}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* ── Top low scores ────────────────────────────── */}
            {topLowScores.length > 0 && (
              <Card>
                <Card.Header>
                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    {t('visualFidelity.lowestScoring')}
                  </h4>
                </Card.Header>
                <Card.Body>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {topLowScores.map((s) => {
                      const composite = Math.round(s.compositeScore);
                      const zone =
                        composite >= 70 ? 'good' : composite >= 50 ? 'warn' : 'bad';
                      return (
                        <div key={s.id} className="space-y-1">
                          <div className="aspect-square rounded overflow-hidden bg-gray-100 relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={s.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            <div
                              className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[11px] font-bold tabular-nums text-white"
                              style={{ backgroundColor: ZONE_HEX[zone] }}
                            >
                              {composite}
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">
                            {formatDate(new Date(s.scoredAt))}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </Card.Body>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

function KpiTile({ icon, label, value, sub }: KpiTileProps) {
  return (
    <Card>
      <Card.Body>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-xl font-semibold text-gray-900 tabular-nums">{value}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </Card.Body>
    </Card>
  );
}

interface RatePillProps {
  label: string;
  rate: number;
  count: number;
}

function RatePill({ label, rate, count }: RatePillProps) {
  const { t } = useTranslation('settings-misc');
  const color = rate >= 70 ? ZONE_HEX.good : rate >= 50 ? ZONE_HEX.warn : ZONE_HEX.bad;
  return (
    <div className="flex flex-col items-center">
      <div className="text-2xl font-bold tabular-nums" style={{ color }}>
        {rate.toFixed(0)}%
      </div>
      <div className="text-xs text-gray-500">
        {label} · {t('visualFidelity.rate.scored', { count })}
      </div>
    </div>
  );
}

interface DistBarProps {
  good: number;
  warn: number;
  bad: number;
  total: number;
}

function DistBar({ good, warn, bad, total }: DistBarProps) {
  if (total === 0) return null;
  const goodPct = (good / total) * 100;
  const warnPct = (warn / total) * 100;
  const badPct = (bad / total) * 100;
  return (
    <div className="flex h-3 rounded overflow-hidden border border-gray-200">
      {good > 0 && <div style={{ width: `${goodPct}%`, backgroundColor: ZONE_HEX.good }} />}
      {warn > 0 && <div style={{ width: `${warnPct}%`, backgroundColor: ZONE_HEX.warn }} />}
      {bad > 0 && <div style={{ width: `${badPct}%`, backgroundColor: ZONE_HEX.bad }} />}
    </div>
  );
}

interface DistLegendProps {
  color: string;
  label: string;
  count: number;
  total: number;
}

function DistLegend({ color, label, count, total }: DistLegendProps) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-gray-700 truncate">{label}</span>
      <span className="text-gray-500 tabular-nums ml-auto">
        {count} ({pct}%)
      </span>
    </div>
  );
}
