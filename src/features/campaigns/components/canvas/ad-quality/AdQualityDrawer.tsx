'use client';

// =============================================================
// AdQualityDrawer — expandable breakdown panel per spec sectie 7.2.
//
// Twee tabs:
// - Rules (L1): gegroepeerd per category (Mechanical / Structural /
//   Coverage), per rule een icon (✓ pass / ⚠ warn / ✕ fail) + message
//   + suggestion + "Go to field" link
// - AI dimensions (L2): score-bar per dimensie + rationale + suggestion
//   + summary onderaan
//
// Failure state: als l2Results.fallback === true, toont een notice
// in plaats van de dimensions tab content.
// =============================================================

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertTriangle, XCircle, ChevronRight, AlertCircle } from 'lucide-react';
import type { RuleResult, RuleCategory, RuleStatus, L2JudgeResult } from '@/lib/ad-validation/types';
import { isFallback } from '@/lib/ad-validation/types';

interface AdQualityDrawerProps {
  open: boolean;
  onClose: () => void;
  score: number;
  ratingLabel: string;
  l1Results: RuleResult[];
  l2Results: L2JudgeResult;
  onFocusField?: (fieldGroup: string) => void;
}

const STATUS_ICON: Record<RuleStatus, React.ComponentType<{ className?: string }>> = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
};

const STATUS_COLOR: Record<RuleStatus, string> = {
  pass: 'text-emerald-600',
  warn: 'text-amber-600',
  fail: 'text-red-600',
};

export function AdQualityDrawer({
  open,
  onClose,
  score,
  ratingLabel,
  l1Results,
  l2Results,
  onFocusField,
}: AdQualityDrawerProps) {
  const { t } = useTranslation('campaigns-canvas');
  const [tab, setTab] = useState<'rules' | 'dimensions'>('rules');

  if (!open) return null;

  const rulesByCategory = groupRulesByCategory(l1Results);
  const l2Fallback = isFallback(l2Results);

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-gray-900">
              {t('adQualityDrawer.breakdown', { label: ratingLabel, score })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {t('adQualityDrawer.hideDetails')}
          </button>
        </div>

        <div className="flex gap-1 mb-3 border-b border-gray-200">
          <TabButton active={tab === 'rules'} onClick={() => setTab('rules')}>
            {t('adQualityDrawer.rulesTab', { count: l1Results.length })}
          </TabButton>
          <TabButton active={tab === 'dimensions'} onClick={() => setTab('dimensions')}>
            {t('adQualityDrawer.dimensionsTab')} {!l2Fallback && `(${Object.keys(l2Results.dimensions).length})`}
          </TabButton>
        </div>

        {tab === 'rules' && (
          <div className="space-y-4">
            {(['mechanical', 'structural', 'coverage'] as RuleCategory[]).map((cat) => {
              const rules = rulesByCategory[cat] ?? [];
              if (rules.length === 0) return null;
              return (
                <section key={cat}>
                  <h4 className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1.5">
                    {t(`adQuality.category.${cat}`)} ({rules.length})
                  </h4>
                  <ul className="space-y-1.5">
                    {rules.map((r, idx) => {
                      const Icon = STATUS_ICON[r.status];
                      return (
                        <li key={`${r.ruleId}-${idx}`} className="bg-white rounded border border-gray-200 p-2.5 flex items-start gap-2.5">
                          <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${STATUS_COLOR[r.status]}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 leading-snug">{r.message}</p>
                            {r.suggestion && (
                              <p className="text-xs text-gray-600 mt-0.5 italic">{r.suggestion}</p>
                            )}
                          </div>
                          {r.fieldGroup && onFocusField && (
                            <button
                              type="button"
                              onClick={() => onFocusField(r.fieldGroup!)}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 flex-shrink-0"
                            >
                              {t('adQualityDrawer.goToField')}
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        {tab === 'dimensions' && (
          <div>
            {l2Fallback ? (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">{t('adQualityDrawer.judgeUnavailable')}</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    {t('adQualityDrawer.judgeUnavailableBody')} {l2Results.error && <span className="block mt-1 font-mono text-[10px] opacity-70">{l2Results.error}</span>}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(l2Results.dimensions).map(([name, dim]) => (
                  <div key={name} className="bg-white rounded border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-semibold text-gray-900 capitalize">
                        {name.replace(/-/g, ' ')}
                      </p>
                      <p className="text-sm font-bold" style={{ color: dimensionColor(dim.score) }}>
                        {dim.score}/100
                      </p>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${dim.score}%`,
                          backgroundColor: dimensionColor(dim.score),
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-700 leading-snug">{dim.rationale}</p>
                    {dim.suggestion && (
                      <p className="text-xs text-gray-600 mt-1 italic">💡 {dim.suggestion}</p>
                    )}
                  </div>
                ))}
                {l2Results.summary && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-blue-700 mb-1">
                      {t('adQualityDrawer.judgeSummary')}
                    </p>
                    <p className="text-sm text-blue-900 leading-relaxed">{l2Results.summary}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? 'border-emerald-600 text-emerald-700'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

function groupRulesByCategory(results: RuleResult[]): Record<RuleCategory, RuleResult[]> {
  const out: Record<RuleCategory, RuleResult[]> = {
    mechanical: [],
    structural: [],
    coverage: [],
  };
  for (const r of results) {
    out[r.category].push(r);
  }
  // Within each category: fail → warn → pass
  const order: Record<RuleStatus, number> = { fail: 0, warn: 1, pass: 2 };
  for (const cat of Object.keys(out) as RuleCategory[]) {
    out[cat].sort((a, b) => order[a.status] - order[b.status]);
  }
  return out;
}

function dimensionColor(score: number): string {
  if (score >= 76) return '#16A34A';
  if (score >= 51) return '#CA8A04';
  if (score >= 26) return '#EA580C';
  return '#DC2626';
}
