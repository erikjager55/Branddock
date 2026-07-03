'use client';

// =============================================================
// FeedbackLoopPanels — InsightsTab Δ-3 sectie (content-test #6.B).
// Drie panels:
//   1. Auto-iterate success-rate (runs / success-rate / avg iterations / avg delta)
//   2. Template-effectiveness (top 5 hint-templates op apply-count + avg delta)
//   3. Edit-distance heatmap (per componentType: total/significant/avgDistance)
// =============================================================

import { useTranslation } from 'react-i18next';
import { Loader2, Repeat, FileEdit, Sparkles } from 'lucide-react';
import {
  useFeedbackLoopMetrics,
  type AutoIterateMetrics,
  type TemplateEffectivenessRow,
  type EditDistanceRow,
} from '@/hooks/useFeedbackLoopMetrics';

export function FeedbackLoopPanels() {
  const { t } = useTranslation('brand-alignment');
  const { data, isPending, isError } = useFeedbackLoopMetrics();

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="text-sm text-red-500 px-4 py-3">
        {t('feedback.loadError')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AutoIteratePanel metrics={data.autoIterate} />
      <TemplateEffectivenessPanel templates={data.templates} />
      <EditDistancePanel rows={data.editDistance} />
    </div>
  );
}

// ─── Auto-iterate ──────────────────────────────────────────

function AutoIteratePanel({ metrics }: { metrics: AutoIterateMetrics }) {
  const { t } = useTranslation('brand-alignment');
  const successRate =
    metrics.totalRuns > 0
      ? Math.round((metrics.successCount / metrics.totalRuns) * 100)
      : 0;
  return (
    <Card icon={Repeat} title={t('feedback.autoIterateTitle')}>
      {metrics.totalRuns === 0 ? (
        <EmptyState message={t('feedback.autoIterateEmpty')} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label={t('feedback.totalRuns')} value={metrics.totalRuns} />
          <Stat label={t('feedback.successRate')} value={`${successRate}%`} accent={successRate >= 70} />
          <Stat label={t('feedback.avgIterations')} value={metrics.avgIterations.toFixed(1)} />
          <Stat label={t('feedback.avgScoreDelta')} value={`+${metrics.avgScoreImprovement}`} accent />
        </div>
      )}
    </Card>
  );
}

// ─── Template-effectiveness ────────────────────────────────

function TemplateEffectivenessPanel({
  templates,
}: {
  templates: TemplateEffectivenessRow[];
}) {
  const { t } = useTranslation('brand-alignment');
  const top5 = templates.slice(0, 5);
  return (
    <Card icon={Sparkles} title={t('feedback.templatesTitle')}>
      {top5.length === 0 ? (
        <EmptyState message={t('feedback.templatesEmpty')} />
      ) : (
        <div className="space-y-2">
          {top5.map((tpl) => (
            <div
              key={tpl.templateId}
              className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg"
            >
              <div className="flex-1 text-sm font-mono text-gray-700 truncate">
                {tpl.templateId}
              </div>
              <div className="text-xs text-gray-500 w-20 text-right">
                {tpl.appliedCount}×
              </div>
              <div
                className={`text-xs font-medium w-20 text-right ${
                  tpl.avgScoreImprovement > 0 ? 'text-emerald-700' : 'text-gray-400'
                }`}
              >
                {tpl.avgScoreImprovement > 0 ? '+' : ''}
                {tpl.avgScoreImprovement.toFixed(1)} {t('feedback.scoreSuffix')}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Edit-distance ─────────────────────────────────────────

function EditDistancePanel({ rows }: { rows: EditDistanceRow[] }) {
  const { t } = useTranslation('brand-alignment');
  const totalEdits = rows.reduce((sum, r) => sum + r.totalEdits, 0);
  return (
    <Card icon={FileEdit} title={t('feedback.editsTitle', { count: totalEdits })}>
      {rows.length === 0 ? (
        <EmptyState message={t('feedback.editsEmpty')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-4">{t('feedback.colComponentType')}</th>
                <th className="py-2 pr-4 text-right">{t('feedback.colEdits')}</th>
                <th className="py-2 pr-4 text-right">{t('feedback.colSignificant')}</th>
                <th className="py-2 pr-4 text-right">{t('feedback.colAvgDistance')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const sigRate =
                  row.totalEdits > 0
                    ? Math.round((row.significantEdits / row.totalEdits) * 100)
                    : 0;
                return (
                  <tr key={row.componentType} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono text-xs text-gray-700">
                      {row.componentType}
                    </td>
                    <td className="py-2 pr-4 text-right">{row.totalEdits}</td>
                    <td
                      className={`py-2 pr-4 text-right ${
                        sigRate > 30 ? 'text-amber-700 font-medium' : 'text-gray-600'
                      }`}
                    >
                      {row.significantEdits} ({sigRate}%)
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-xs">
                      {row.avgDistance.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── Shared UI ─────────────────────────────────────────────

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div
        className={`text-lg font-semibold ${
          accent ? 'text-emerald-700' : 'text-gray-900'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="text-xs text-gray-400 italic py-2">{message}</div>;
}
