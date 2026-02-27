'use client';

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Bot,
  Target,
  Heart,
  Zap,
  TrendingUp,
  Brain,
  Lightbulb,
} from 'lucide-react';
import type { ExplorationConfig, ExplorationInsightsData } from './types';
import { AIExplorationDimensionCard } from './AIExplorationDimensionCard';

const FINDING_CONFIGS = [
  { icon: Target, bg: '#dbeafe', color: '#2563eb' },
  { icon: Heart, bg: '#fce7f3', color: '#db2777' },
  { icon: Zap, bg: '#fef3c7', color: '#d97706' },
  { icon: Brain, bg: '#ede9fe', color: '#7c3aed' },
  { icon: TrendingUp, bg: '#d1fae5', color: '#059669' },
];

interface AIExplorationReportProps {
  config: ExplorationConfig;
  insightsData: ExplorationInsightsData;
  onViewSuggestions?: () => void;
}

export function AIExplorationReport({ config, insightsData, onViewSuggestions }: AIExplorationReportProps) {
  const dimensions = insightsData.dimensions ?? [];
  const totalDimensions = dimensions.length;
  const findings = insightsData.findings ?? dimensions.map((d) => ({
    title: d.title,
    description: d.summary,
  }));
  const recommendations = insightsData.recommendations ?? [];
  const executiveSummary =
    insightsData.executiveSummary ??
    `The AI analysis of ${config.itemName} has analyzed ${totalDimensions} strategic dimensions and provides insights for market positioning and communication.`;
  const suggestionCount = (insightsData.fieldSuggestions ?? []).length;
  const researchBoost = insightsData.researchBoostPercentage ?? 15;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={config.onBack}
        className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
        style={{ color: '#6b7280' }}
      >
        <ArrowLeft className="w-4 h-4" />
        {config.backLabel ?? 'Back'}
      </button>

      {/* Success Header */}
      <div
        className="rounded-xl relative overflow-hidden"
        style={{
          padding: '32px',
          background: 'linear-gradient(135deg, #ecfdf5, #d1fae5, #a7f3d0)',
          border: '1px solid #6ee7b7',
        }}
      >
        <div className="flex items-start gap-4 relative z-10">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(5,150,105,0.15)' }}
          >
            <CheckCircle className="h-6 w-6" style={{ color: '#059669' }} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold" style={{ color: '#064e3b' }}>
              {config.pageTitle ?? 'AI Analysis'} Complete
            </h2>
            <p className="text-sm" style={{ color: '#047857', marginTop: '4px' }}>
              {config.itemName} has been successfully analyzed across {totalDimensions} strategic dimensions.
            </p>

            <div className="grid grid-cols-2 gap-4" style={{ marginTop: '24px' }}>
              <div className="rounded-lg" style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.6)', border: '1px solid rgba(110,231,183,0.5)' }}>
                <div className="text-2xl font-bold" style={{ color: '#065f46' }}>{totalDimensions}</div>
                <div className="text-sm" style={{ color: '#059669' }}>Dimensions analyzed</div>
              </div>
              <div className="rounded-lg" style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.6)', border: '1px solid rgba(110,231,183,0.5)' }}>
                <div className="text-2xl font-bold" style={{ color: '#065f46' }}>+{researchBoost}%</div>
                <div className="text-sm" style={{ color: '#059669' }}>Research confidence</div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #059669, transparent)' }} />
      </div>

      {/* Executive Summary */}
      <div className="rounded-xl" style={{ padding: '24px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '16px' }}>
          <Sparkles className="h-5 w-5" style={{ color: '#14b8a6' }} />
          <h3 className="text-lg font-semibold" style={{ color: '#111827' }}>Executive Summary</h3>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{executiveSummary}</p>
      </div>

      {/* Dimension Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dimensions.map((dimension) => (
          <AIExplorationDimensionCard key={dimension.key} dimension={dimension} dimensionConfigs={config.dimensions} />
        ))}
      </div>

      {/* Findings */}
      {findings.length > 0 && (
        <div className="rounded-xl" style={{ padding: '24px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '24px' }}>
            <Bot className="h-5 w-5" style={{ color: '#14b8a6' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#111827' }}>Key Findings</h3>
          </div>
          <div className="space-y-5">
            {findings.map((finding, i) => {
              const cfg = FINDING_CONFIGS[i % FINDING_CONFIGS.length];
              const Icon = cfg.icon;
              return (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.bg }}>
                    <Icon className="h-5 w-5" style={{ color: cfg.color }} />
                  </div>
                  <div style={{ paddingTop: '2px' }}>
                    <h4 className="text-sm font-semibold" style={{ color: '#111827' }}>{finding.title}</h4>
                    <p className="text-sm" style={{ color: '#6b7280', marginTop: '2px' }}>{finding.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-xl" style={{ padding: '24px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '24px' }}>
            <TrendingUp className="h-5 w-5" style={{ color: '#14b8a6' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#111827' }}>Strategic Recommendations</h3>
          </div>
          <div className="space-y-4">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #14b8a6, #10b981)' }}>
                  <span className="text-sm font-bold text-white">{i + 1}</span>
                </div>
                <p className="text-sm" style={{ color: '#374151', paddingTop: '6px' }}>{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between" style={{ paddingTop: '16px', paddingBottom: '8px' }}>
        <button
          onClick={config.onBack}
          className="flex items-center gap-2 rounded-lg text-sm transition-colors hover:opacity-80"
          style={{ padding: '10px 16px', color: '#4b5563', border: '1px solid #e5e7eb' }}
        >
          <ArrowLeft className="h-4 w-4" />
          {config.backLabel ?? 'Back'}
        </button>
        {suggestionCount > 0 && onViewSuggestions && (
          <button
            onClick={onViewSuggestions}
            className="flex items-center gap-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
            }}
          >
            <Lightbulb className="h-4 w-4" />
            View {suggestionCount} Suggestions
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
