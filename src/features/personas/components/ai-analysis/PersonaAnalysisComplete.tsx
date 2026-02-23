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
  Calendar,
  Lock,
  Download,
  Table2,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PersonaInsightsData, FieldSuggestion } from '../../types/persona-analysis.types';
import type { UpdatePersonaBody } from '../../types/persona.types';
import { FieldSuggestionCard } from './FieldSuggestionCard';

const FINDING_CONFIGS = [
  { icon: Target, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
  { icon: Heart, bgColor: 'bg-pink-100', iconColor: 'text-pink-600' },
  { icon: Zap, bgColor: 'bg-amber-100', iconColor: 'text-amber-600' },
  { icon: Brain, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
  { icon: TrendingUp, bgColor: 'bg-emerald-100', iconColor: 'text-emerald-600' },
];

interface PersonaAnalysisCompleteProps {
  insightsData: PersonaInsightsData;
  personaName: string;
  onBack: () => void;
  onUpdatePersona?: (data: UpdatePersonaBody) => Promise<unknown>;
}

export function PersonaAnalysisComplete({
  insightsData,
  personaName,
  onBack,
  onUpdatePersona,
}: PersonaAnalysisCompleteProps) {
  const totalDimensions = insightsData.dimensions.length;
  const findings = insightsData.findings ?? insightsData.dimensions.map((d) => ({
    title: d.title,
    description: d.summary,
  }));
  const recommendations = insightsData.recommendations ?? [
    `Integreer het profiel van ${personaName} in communicatie-uitingen`,
    'Ontwikkel persona-specifieke customer journeys',
    'Creëer content die waarde tastbaar maakt',
    'Bouw thought leadership rond klantuitdagingen',
    'Vertaal waarden naar gedragingen en besliscriteria',
  ];
  const executiveSummary = insightsData.executiveSummary
    ?? `De AI-analyse van ${personaName} heeft ${totalDimensions} strategische dimensies geanalyseerd en biedt inzichten voor merkpositionering en communicatie.`;

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
    if (!onUpdatePersona) return;

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
      await onUpdatePersona(update as UpdatePersonaBody);
      toast.success(`${toApply.length} field${toApply.length > 1 ? 's' : ''} updated on persona`);
      // Mark all applied as accepted (visual confirmation)
      setSuggestions((prev) =>
        prev.map((s) =>
          s.status === 'accepted' || s.status === 'edited'
            ? { ...s, status: 'accepted' as const }
            : s,
        ),
      );
      onBack();
    } catch {
      toast.error('Failed to update persona');
    } finally {
      setIsApplying(false);
    }
  }, [suggestions, onUpdatePersona, onBack]);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Persona
      </button>

      {/* Success Header */}
      <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">AI Persona Analysis Complete</h2>
            <p className="text-sm text-gray-500 mt-1">
              Your persona has been successfully analyzed across {totalDimensions} key dimensions.
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Completed: {new Date(insightsData.completedAt).toLocaleDateString('en-GB', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button className="inline-flex items-center gap-1.5 border border-gray-200 bg-white rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <Lock className="h-3.5 w-3.5" />
                Unlocked
              </button>
              <button className="inline-flex items-center gap-1.5 border border-gray-200 bg-white rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <Download className="h-3.5 w-3.5" />
                PDF download
              </button>
              <button className="inline-flex items-center gap-1.5 border border-gray-200 bg-white rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <Table2 className="h-3.5 w-3.5" />
                Download raw data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">AI Gegenereerd Rapport</h3>
          <p className="text-xs text-gray-500">Op basis van {totalDimensions} beantwoorde vragen</p>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="border border-gray-200 bg-white rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-teal-500" />
          <h3 className="text-lg font-semibold text-gray-900">Executive Summary</h3>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
          {executiveSummary}
        </p>
      </div>

      {/* Findings */}
      <div className="border border-gray-200 bg-white rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <CheckCircle className="h-5 w-5 text-emerald-500" />
          <h3 className="text-lg font-semibold text-gray-900">Belangrijkste Bevindingen</h3>
        </div>
        <div className="space-y-3">
          {findings.map((finding, i) => {
            const config = FINDING_CONFIGS[i % FINDING_CONFIGS.length];
            const Icon = config.icon;
            return (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bgColor}`}>
                  <Icon className={`h-5 w-5 ${config.iconColor}`} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{finding.title}</h4>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{finding.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      <div className="border border-gray-200 bg-white rounded-xl p-6">
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

      {/* Field Suggestions Section */}
      {hasSuggestions && (
        <div className="border border-amber-200 bg-amber-50/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900">Voorgestelde Updates voor Persona</h3>
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
            Op basis van de analyse stellen we de volgende updates voor op het persona profiel.
            Accepteer, bewerk, of weiger per veld.
          </p>
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <FieldSuggestionCard
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
          onClick={onBack}
          className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Persona
        </button>
        {hasApplicable && onUpdatePersona ? (
          <button
            onClick={handleApplyChanges}
            disabled={isApplying}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            {isApplying
              ? 'Applying...'
              : `Apply ${acceptedCount} Change${acceptedCount > 1 ? 's' : ''} & Done`}
          </button>
        ) : (
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            Done
          </button>
        )}
      </div>
    </div>
  );
}
