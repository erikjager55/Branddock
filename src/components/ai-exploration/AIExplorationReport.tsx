'use client';

import { useState, useCallback } from 'react';
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
  { icon: Target, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
  { icon: Heart, bgColor: 'bg-pink-100', iconColor: 'text-pink-600' },
  { icon: Zap, bgColor: 'bg-amber-100', iconColor: 'text-amber-600' },
  { icon: Brain, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
  { icon: TrendingUp, bgColor: 'bg-emerald-100', iconColor: 'text-emerald-600' },
];

interface AIExplorationReportProps {
  config: ExplorationConfig;
  insightsData: ExplorationInsightsData;
  onViewSuggestions?: () => void;
}

export function AIExplorationReport({ config, insightsData, onViewSuggestions }: AIExplorationReportProps) {
  const totalDimensions = insightsData.dimensions.length;
  const findings = insightsData.findings ?? insightsData.dimensions.map((d) => ({
    title: d.title,
    description: d.summary,
  }));
  const recommendations = insightsData.recommendations ?? [];
  const executiveSummary =
    insightsData.executiveSummary ??
    `De AI-analyse van ${config.itemName} heeft ${totalDimensions} strategische dimensies geanalyseerd.`;

  const suggestionCount = (insightsData.fieldSuggestions ?? []).length;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={config.onBack}
        className="flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: '#6b7280' }}
      >
        <ArrowLeft className="w-4 h-4" />
        {config.backLabel ?? 'Back'}
      </button>

      {/* Success Header */}
      <div className="rounded-xl p-6" style={{ border: '1px solid #a7f3d0', backgroundColor: '#ecfdf5' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#d1fae5' }}>
            <CheckCircle className="h-6 w-6" style={{ color: '#059669' }} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold" style={{ color: '#111827' }}>
              {config.pageTitle ?? 'AI Analysis'} Complete
            </h2>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
              {config.itemName} has been successfully analyzed across {totalDimensions} key
              dimensions.
            </p>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="rounded-xl p-6" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5" style={{ color: '#14b8a6' }} />
          <h3 className="text-lg font-semibold" style={{ color: '#111827' }}>Executive Summary</h3>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{executiveSummary}</p>
      </div>

      {/* Dimension Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insightsData.dimensions.map((dimension) => (
          <AIExplorationDimensionCard
            key={dimension.key}
            dimension={dimension}
            dimensionConfigs={config.dimensions}
          />
        ))}
      </div>

      {/* Findings */}
      {findings.length > 0 && (
        <div className="rounded-xl p-6" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-2 mb-6">
            <Bot className="h-5 w-5" style={{ color: '#14b8a6' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#111827' }}>Belangrijkste Bevindingen</h3>
          </div>
          <div className="space-y-4">
            {findings.map((finding, i) => {
              const cfg = FINDING_CONFIGS[i % FINDING_CONFIGS.length];
              const Icon = cfg.icon;
              return (
                <div key={i} className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg ${cfg.bgColor} flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold" style={{ color: '#111827' }}>{finding.title}</h4>
                    <p className="text-sm mt-0.5" style={{ color: '#4b5563' }}>{finding.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-xl p-6" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5" style={{ color: '#14b8a6' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#111827' }}>Strategische Aanbevelingen</h3>
          </div>
          <div className="space-y-4">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#d1fae5' }}>
                  <span className="text-sm font-bold" style={{ color: '#059669' }}>{i + 1}</span>
                </div>
                <p className="text-sm pt-1.5" style={{ color: '#374151' }}>{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={config.onBack}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors"
          style={{ color: '#4b5563', border: '1px solid #e5e7eb' }}
        >
          <ArrowLeft className="h-4 w-4" />
          {config.backLabel ?? 'Back'}
        </button>
        {suggestionCount > 0 && onViewSuggestions && (
          <button
            onClick={onViewSuggestions}
            className="flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white transition-colors"
          >
            <Lightbulb className="h-4 w-4" />
            Bekijk {suggestionCount} Suggesties
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
