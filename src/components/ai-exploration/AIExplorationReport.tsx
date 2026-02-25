'use client';

import { useState, useCallback } from 'react';
import {
  ArrowLeft,
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
import { toast } from 'sonner';
import type { ExplorationConfig, ExplorationInsightsData, FieldSuggestion } from './types';
import { AIExplorationFieldSuggestion } from './AIExplorationFieldSuggestion';
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
}

export function AIExplorationReport({ config, insightsData }: AIExplorationReportProps) {
  const totalDimensions = insightsData.dimensions.length;
  const findings = insightsData.findings ?? insightsData.dimensions.map((d) => ({
    title: d.title,
    description: d.summary,
  }));
  const recommendations = insightsData.recommendations ?? [];
  const executiveSummary =
    insightsData.executiveSummary ??
    `De AI-analyse van ${config.itemName} heeft ${totalDimensions} strategische dimensies geanalyseerd.`;

  // ─── Field Suggestions State ─────────────────────────────
  const [suggestions, setSuggestions] = useState<FieldSuggestion[]>(
    insightsData.fieldSuggestions ?? [],
  );
  const [isApplying, setIsApplying] = useState(false);

  const acceptedCount = suggestions.filter(
    (s) => s.status === 'accepted' || s.status === 'edited',
  ).length;
  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;
  const hasSuggestions = suggestions.length > 0;
  const hasApplicable = acceptedCount > 0;

  const handleAccept = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'accepted' as const } : s)),
    );
  }, []);

  const handleReject = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'rejected' as const } : s)),
    );
  }, []);

  const handleEdit = useCallback((id: string, newValue: string | string[]) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, suggestedValue: newValue, status: 'edited' as const } : s,
      ),
    );
  }, []);

  const handleAcceptAll = useCallback(() => {
    setSuggestions((prev) =>
      prev.map((s) => (s.status === 'pending' ? { ...s, status: 'accepted' as const } : s)),
    );
  }, []);

  const handleApplyChanges = useCallback(async () => {
    const toApply = suggestions.filter(
      (s) => s.status === 'accepted' || s.status === 'edited',
    );
    if (toApply.length === 0) return;

    setIsApplying(true);
    try {
      const update: Record<string, string | string[] | null> = {};
      for (const s of toApply) {
        update[s.field] = s.suggestedValue;
      }
      await config.onApplyChanges(update);
      toast.success(`${toApply.length} field${toApply.length > 1 ? 's' : ''} updated`);
      setSuggestions((prev) =>
        prev.map((s) =>
          s.status === 'accepted' || s.status === 'edited'
            ? { ...s, status: 'accepted' as const }
            : s,
        ),
      );
      config.onBack();
    } catch {
      toast.error('Failed to apply changes');
    } finally {
      setIsApplying(false);
    }
  }, [suggestions, config]);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={config.onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {config.backLabel ?? 'Back'}
      </button>

      {/* Success Header */}
      <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">
              {config.pageTitle ?? 'AI Analysis'} Complete
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {config.itemName} has been successfully analyzed across {totalDimensions} key
              dimensions.
            </p>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-teal-500" />
          <h3 className="text-lg font-semibold text-gray-900">Executive Summary</h3>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{executiveSummary}</p>
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
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Bot className="h-5 w-5 text-teal-500" />
            <h3 className="text-lg font-semibold text-gray-900">Belangrijkste Bevindingen</h3>
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
                    <h4 className="text-sm font-semibold text-gray-900">{finding.title}</h4>
                    <p className="text-sm text-gray-600 mt-0.5">{finding.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-teal-500" />
            <h3 className="text-lg font-semibold text-gray-900">Strategische Aanbevelingen</h3>
          </div>
          <div className="space-y-4">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-emerald-600">{i + 1}</span>
                </div>
                <p className="text-sm text-gray-700 pt-1.5">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Field Suggestions Section */}
      {hasSuggestions && (
        <div className="border border-amber-200 bg-amber-50/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900">Voorgestelde Updates</h3>
              {pendingCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  {pendingCount} pending
                </span>
              )}
            </div>
            {pendingCount > 0 && (
              <button
                onClick={handleAcceptAll}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Accept all
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Op basis van de analyse stellen we de volgende updates voor. Accepteer, bewerk, of weiger
            per veld.
          </p>
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <AIExplorationFieldSuggestion
                key={suggestion.id}
                suggestion={suggestion}
                onAccept={handleAccept}
                onReject={handleReject}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={config.onBack}
          className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {config.backLabel ?? 'Back'}
        </button>
        {hasApplicable && (
          <button
            onClick={handleApplyChanges}
            disabled={isApplying}
            className="flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white disabled:opacity-50 transition-colors"
          >
            {isApplying ? 'Applying...' : `Apply ${acceptedCount} Change${acceptedCount > 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  );
}
