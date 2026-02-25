'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, Lightbulb, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { ExplorationConfig, ExplorationInsightsData, FieldSuggestion } from './types';
import { AIExplorationFieldSuggestion } from './AIExplorationFieldSuggestion';

interface AIExplorationSuggestionsProps {
  config: ExplorationConfig;
  insightsData: ExplorationInsightsData;
  onBackToReport: () => void;
}

export function AIExplorationSuggestions({
  config,
  insightsData,
  onBackToReport,
}: AIExplorationSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<FieldSuggestion[]>(
    insightsData.fieldSuggestions ?? [],
  );
  const [isApplying, setIsApplying] = useState(false);

  const acceptedCount = suggestions.filter(
    (s) => s.status === 'accepted' || s.status === 'edited',
  ).length;
  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;
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
      toast.success(`${toApply.length} veld${toApply.length > 1 ? 'en' : ''} bijgewerkt`);
      config.onBack();
    } catch {
      toast.error('Wijzigingen toepassen mislukt');
    } finally {
      setIsApplying(false);
    }
  }, [suggestions, config]);

  if (suggestions.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <button
          onClick={onBackToReport}
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: '#6b7280' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar Rapport
        </button>
        <div className="text-center py-16">
          <Lightbulb className="h-12 w-12 mx-auto mb-4" style={{ color: '#d1d5db' }} />
          <p className="text-sm" style={{ color: '#6b7280' }}>
            Geen veld-suggesties beschikbaar voor {config.itemName}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Back to report */}
      <button
        onClick={onBackToReport}
        className="flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: '#6b7280' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Terug naar Rapport
      </button>

      {/* Header */}
      <div className="rounded-xl p-6" style={{ border: '1px solid #fde68a', backgroundColor: 'rgba(255, 251, 235, 0.5)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fef3c7' }}>
              <Lightbulb className="h-5 w-5" style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>
                Voorgestelde Updates
              </h2>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                {suggestions.length} suggestie{suggestions.length > 1 ? 's' : ''} voor {config.itemName}
              </p>
            </div>
          </div>
          {pendingCount > 0 && (
            <button
              onClick={handleAcceptAll}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: '#059669', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}
            >
              <Check className="h-3.5 w-3.5" />
              Accepteer alle ({pendingCount})
            </button>
          )}
        </div>
        <p className="text-sm" style={{ color: '#6b7280' }}>
          Op basis van de analyse stellen we de volgende updates voor. Accepteer, bewerk, of weiger per veld.
        </p>
      </div>

      {/* Suggestions List */}
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

      {/* Footer */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBackToReport}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors"
          style={{ color: '#4b5563', border: '1px solid #e5e7eb' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Terug naar Rapport
        </button>
        {hasApplicable && (
          <button
            onClick={handleApplyChanges}
            disabled={isApplying}
            className="flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white disabled:opacity-50 transition-colors"
          >
            {isApplying
              ? 'Toepassen...'
              : `${acceptedCount} Wijziging${acceptedCount > 1 ? 'en' : ''} Toepassen`}
          </button>
        )}
      </div>
    </div>
  );
}
