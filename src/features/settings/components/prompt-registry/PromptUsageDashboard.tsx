'use client';

import { Activity, Clock, AlertCircle, DollarSign, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/shared';
import { usePromptDashboard } from '@/features/settings/hooks/use-prompt-registry';

/**
 * Aggregate dashboard above the prompt-registry list.
 *
 * Renders 30-day stats from /api/admin/prompt-registry/dashboard:
 * call totals, cost, per-provider failure rates, top sources by calls
 * and by errors. Read-only — drill-down via the list below.
 *
 * Mounted at the top of PromptRegistryTab.
 */
export function PromptUsageDashboard() {
  const { t } = useTranslation('settings-misc');
  const { data, isLoading, error } = usePromptDashboard();

  if (isLoading) {
    return (
      <div className="text-sm text-gray-400 px-2 py-3">{t('promptDashboard.loading')}</div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-2 py-3 text-sm text-red-600">
        <AlertCircle className="h-4 w-4" />
        {t('promptDashboard.loadFailed', { message: error instanceof Error ? error.message : t('prompts.unknownError') })}
      </div>
    );
  }

  if (!data) return null;

  const { totals, providers, models, topByCalls, topByErrors } = data;

  return (
    <div className="space-y-4">
      {/* ── Totals row ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile
          icon={<Activity className="h-4 w-4 text-teal-600" />}
          label={t('promptDashboard.kpi.calls24h')}
          value={totals.calls24h.toLocaleString()}
          sub={t('promptDashboard.kpi.calls24hSub', { count: totals.calls7d.toLocaleString() })}
        />
        <KpiTile
          icon={<BarChart3 className="h-4 w-4 text-blue-600" />}
          label={t('promptDashboard.kpi.calls30d')}
          value={totals.calls30d.toLocaleString()}
          sub={t('promptDashboard.kpi.calls30dSub', { count: totals.callsAllTime.toLocaleString() })}
        />
        <KpiTile
          icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
          label={t('promptDashboard.kpi.cost24h')}
          value={`$${totals.cost24h.toFixed(2)}`}
          sub={t('promptDashboard.kpi.cost24hSub', { cost: totals.cost7d.toFixed(2) })}
        />
        <KpiTile
          icon={<DollarSign className="h-4 w-4 text-amber-600" />}
          label={t('promptDashboard.kpi.cost30d')}
          value={`$${totals.cost30d.toFixed(2)}`}
          sub={t('promptDashboard.kpi.cost30dSub')}
        />
      </div>

      {totals.calls30d === 0 && (
        <Card>
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            {t('promptDashboard.empty')}
          </div>
        </Card>
      )}

      {totals.calls30d > 0 && (
        <>
          {/* ── Providers ──────────────────────────────────── */}
          <Card>
            <Card.Header>
              <h4 className="text-sm font-medium text-gray-900">{t('promptDashboard.providers')}</h4>
            </Card.Header>
            <Card.Body>
              <div className="space-y-2">
                {providers.map((p) => {
                  const failureColor =
                    p.failureRate >= 5 ? 'text-red-600' : p.failureRate >= 1 ? 'text-amber-600' : 'text-emerald-600';
                  return (
                    <div
                      key={p.provider}
                      className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0"
                    >
                      <span className="font-medium text-gray-900 capitalize w-32">{p.provider}</span>
                      <span className="text-gray-700 w-20 text-right tabular-nums">{p.callCount}</span>
                      <span className={`text-xs w-16 text-right tabular-nums ${failureColor}`}>
                        {t('promptDashboard.failRate', { rate: p.failureRate.toFixed(1) })}
                      </span>
                      <span className="text-xs text-gray-500 w-20 text-right tabular-nums">
                        <Clock className="inline h-3 w-3 mr-0.5" />
                        {p.avgLatencyMs}ms
                      </span>
                      <span className="text-xs text-gray-700 w-20 text-right tabular-nums">${p.costUsd.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </Card.Body>
          </Card>

          {/* ── Models ─────────────────────────────────────── */}
          {models.length > 0 && (
            <Card>
              <Card.Header>
                <h4 className="text-sm font-medium text-gray-900">{t('promptDashboard.topModels')}</h4>
              </Card.Header>
              <Card.Body>
                <div className="space-y-1">
                  {models.slice(0, 10).map((m) => (
                    <div
                      key={`${m.provider}::${m.model}`}
                      className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0"
                    >
                      <span className="text-gray-900 font-mono text-xs">{m.model}</span>
                      <span className="text-gray-500 text-xs capitalize">{m.provider}</span>
                      <span className="text-gray-700 tabular-nums">{m.callCount}</span>
                      <span className="text-gray-700 tabular-nums w-16 text-right">${m.costUsd.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          )}

          {/* ── Top by calls + errors side-by-side ────────── */}
          <div className="grid md:grid-cols-2 gap-3">
            <Card>
              <Card.Header>
                <h4 className="text-sm font-medium text-gray-900">{t('promptDashboard.topByCalls')}</h4>
              </Card.Header>
              <Card.Body>
                {topByCalls.length === 0 ? (
                  <div className="text-xs text-gray-500 py-2">{t('promptDashboard.noCallsYet')}</div>
                ) : (
                  <div className="space-y-1">
                    {topByCalls.map((s) => (
                      <SourceRow key={s.sourceIdentifier} stat={s} mode="calls" />
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
            <Card>
              <Card.Header>
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  {t('promptDashboard.topByErrors')}
                </h4>
              </Card.Header>
              <Card.Body>
                {topByErrors.length === 0 ? (
                  <div className="text-xs text-emerald-600 py-2">{t('promptDashboard.noErrors')}</div>
                ) : (
                  <div className="space-y-1">
                    {topByErrors.map((s) => (
                      <SourceRow key={s.sourceIdentifier} stat={s} mode="errors" />
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        </>
      )}
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

interface SourceRowProps {
  stat: { sourceIdentifier: string; callCount: number; errorCount: number; costUsd: number };
  mode: 'calls' | 'errors';
}

function SourceRow({ stat, mode }: SourceRowProps) {
  const { t } = useTranslation('settings-misc');
  const errorRate = stat.callCount > 0 ? (stat.errorCount / stat.callCount) * 100 : 0;
  return (
    <div className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
      <span className="text-gray-900 font-mono truncate max-w-[60%]" title={stat.sourceIdentifier}>
        {stat.sourceIdentifier}
      </span>
      <div className="flex items-center gap-3 text-gray-600">
        {mode === 'calls' ? (
          <>
            <span className="tabular-nums">{t('promptDashboard.source.calls', { count: stat.callCount })}</span>
            <span className="tabular-nums w-16 text-right">${stat.costUsd.toFixed(3)}</span>
          </>
        ) : (
          <>
            <span className="tabular-nums text-red-600">
              {t('promptDashboard.source.errors', { count: stat.errorCount, rate: errorRate.toFixed(1) })}
            </span>
            <span className="tabular-nums w-16 text-right">${stat.costUsd.toFixed(3)}</span>
          </>
        )}
      </div>
    </div>
  );
}
