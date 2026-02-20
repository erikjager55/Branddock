'use client';

import { ArrowLeft, CheckCircle, Sparkles, User } from 'lucide-react';
import type { PersonaInsightsData } from '../../types/persona-analysis.types';

const DIMENSION_DOT_COLORS: Record<string, string> = {
  demographics: 'bg-emerald-500',
  goals_motivations: 'bg-purple-500',
  challenges_frustrations: 'bg-pink-500',
  value_proposition: 'bg-amber-500',
};

interface PersonaAnalysisCompleteProps {
  insightsData: PersonaInsightsData;
  personaName: string;
  onBack: () => void;
}

export function PersonaAnalysisComplete({ insightsData, personaName, onBack }: PersonaAnalysisCompleteProps) {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Persona
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">AI Persona Analysis</h1>
            <p className="text-sm text-muted-foreground">
              Strategische inzichten voor {personaName}
            </p>
          </div>
        </div>
        <div className="bg-white border border-emerald-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium text-emerald-700">Result</span>
        </div>
      </div>

      {/* Success Card */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="bg-emerald-100 rounded-full p-2.5 flex-shrink-0">
            <CheckCircle className="w-7 h-7 text-emerald-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">AI Persona Analysis Complete</h2>
            <p className="text-sm text-gray-600">
              Je persona analyse is succesvol gegenereerd op basis van 4 strategische dimensies.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-5">
          <div className="bg-white/60 rounded-lg p-4">
            <div className="text-3xl font-bold text-emerald-600">4</div>
            <div className="text-sm text-gray-600 mt-0.5">Dimensies geanalyseerd</div>
          </div>
          <div className="bg-white/60 rounded-lg p-4">
            <div className="text-3xl font-bold text-emerald-600">+{insightsData.researchBoostPercentage}%</div>
            <div className="text-sm text-gray-600 mt-0.5">Research vertrouwen</div>
          </div>
        </div>
      </div>

      {/* Gegenereerde Inzichten */}
      <div className="bg-white border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-foreground">Gegenereerde Inzichten</h3>
        </div>
        <div className="space-y-0">
          {insightsData.dimensions.map((dim, index) => {
            const dotColor = DIMENSION_DOT_COLORS[dim.key] ?? 'bg-gray-400';
            return (
              <div key={dim.key}>
                {index > 0 && <div className="border-t border-border my-4" />}
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${dotColor} mt-1.5 flex-shrink-0`} />
                  <div>
                    <div className="font-medium text-foreground">{dim.title}</div>
                    <p className="text-sm text-muted-foreground mt-0.5">{dim.summary}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Persona
        </button>
        <button
          onClick={onBack}
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          Edit Answers
        </button>
      </div>
    </div>
  );
}
