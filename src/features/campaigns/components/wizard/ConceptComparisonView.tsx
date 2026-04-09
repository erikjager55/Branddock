'use client';

import React, { useMemo } from 'react';
import { Check, X, Crown, Sparkles } from 'lucide-react';
import { Badge } from '@/components/shared';
import type { CreativeConcept, PersonaValidationResult, StickinessScore, CampaignLineTests } from '@/lib/campaigns/strategy-blueprint.types';

interface ConceptComparisonViewProps {
  concepts: CreativeConcept[];
  personaValidation?: PersonaValidationResult[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

/** Compute a comparison score from stickiness + persona scores */
function computeComparisonScore(
  concept: CreativeConcept,
  conceptIndex: number,
  personaValidation?: PersonaValidationResult[],
): number {
  const stickinessAvg = concept.stickinessScore?.total ?? 5;

  // Extract persona scores for this specific hook (A=0, B=1, C=2)
  const hookKey = `hook${String.fromCharCode(65 + conceptIndex)}Score` as 'hookAScore' | 'hookBScore' | 'hookCScore';
  const personaScores = (personaValidation ?? [])
    .map(pv => (pv as unknown as Record<string, unknown>)[hookKey])
    .filter((s): s is number => typeof s === 'number');
  const personaAvg = personaScores.length > 0
    ? personaScores.reduce((a, b) => a + b, 0) / personaScores.length
    : 5;

  // Count passed tests (handle both boolean and object formats)
  const tests = concept.campaignLineTests;
  let testsPassed = 0;
  if (tests) {
    const testKeys = ['barTest', 'tShirtTest', 'parodyTest', 'tenYearTest', 'categoryEscapeTest', 'oppositeTest'] as const;
    for (const key of testKeys) {
      const val = tests[key];
      if (typeof val === 'boolean' && val) testsPassed++;
      else if (typeof val === 'object' && val !== null && 'pass' in val && (val as { pass: boolean }).pass) testsPassed++;
    }
  }

  return (stickinessAvg * 0.4) + (personaAvg * 0.4) + (testsPassed / 6 * 10 * 0.2);
}

/** Render a stickiness score bar */
function ScoreBar({ label, value }: { label: string; value: number }) {
  const width = Math.max(0, Math.min(100, value * 10));
  const color = value >= 7 ? 'bg-emerald-500' : value >= 5 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-5 text-right">{value}</span>
    </div>
  );
}

/** Render a campaign line test result */
function TestResult({ label, value }: { label: string; value: boolean | { pass: boolean; evidence?: string } }) {
  const pass = typeof value === 'boolean' ? value : value?.pass ?? false;
  const evidence = typeof value === 'object' && value !== null && 'evidence' in value ? (value as { evidence?: string }).evidence : undefined;
  return (
    <div className="flex items-center gap-1.5" title={evidence}>
      {pass ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <X className="h-3.5 w-3.5 text-red-400" />
      )}
      <span className={`text-xs ${pass ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}

export default function ConceptComparisonView({
  concepts,
  personaValidation,
  selectedIndex,
  onSelect,
  onRegenerate,
  isRegenerating,
}: ConceptComparisonViewProps) {
  const scores = useMemo(
    () => concepts.map((c, i) => computeComparisonScore(c, i, personaValidation)),
    [concepts, personaValidation],
  );

  const bestIndex = useMemo(() => {
    let best = 0;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[best]) best = i;
    }
    return best;
  }, [scores]);

  const labels = ['A', 'B', 'C'];
  const colors = ['teal', 'violet', 'amber'] as const;
  const borderColors = {
    teal: 'border-teal-500 bg-teal-50/50',
    violet: 'border-violet-500 bg-violet-50/50',
    amber: 'border-amber-500 bg-amber-50/50',
  };
  const headerColors = {
    teal: 'bg-teal-100 text-teal-800',
    violet: 'bg-violet-100 text-violet-800',
    amber: 'bg-amber-100 text-amber-800',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">Compare Creative Concepts</h3>
        <p className="text-sm text-gray-500 mt-1">Review all three concepts side by side. The recommended concept is highlighted.</p>
      </div>

      {/* 3-column comparison grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {concepts.map((concept, i) => {
          const isSelected = selectedIndex === i;
          const isBest = bestIndex === i;
          const color = colors[i];
          const score = scores[i];
          const ss = concept.stickinessScore;
          const tests = concept.campaignLineTests;

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                isSelected
                  ? borderColors[color]
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${headerColors[color]}`}>
                  Concept {labels[i]}
                </span>
                <div className="flex items-center gap-1.5">
                  {isBest && (
                    <Badge variant="success" className="text-[10px]">
                      <Crown className="h-3 w-3 mr-0.5" />
                      Recommended
                    </Badge>
                  )}
                  <span className="text-sm font-bold text-gray-700">{score.toFixed(1)}</span>
                </div>
              </div>

              {/* Campaign Line */}
              <h4 className="text-base font-bold text-gray-900 mb-1 leading-tight">
                &ldquo;{concept.campaignLine}&rdquo;
              </h4>
              <p className="text-xs text-gray-600 mb-3 line-clamp-2">{concept.bigIdea}</p>

              {/* Creative Method Badges */}
              <div className="flex flex-wrap gap-1 mb-3">
                <Badge variant="default" className="text-[10px]">{concept.goldenbergTemplate}</Badge>
                <Badge variant="info" className="text-[10px]">{concept.bisociationDomain?.domain ?? 'N/A'}</Badge>
              </div>

              {/* Stickiness Scores */}
              {ss && (
                <div className="space-y-1 mb-3">
                  <h5 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">SUCCESs Score ({ss.total}/10)</h5>
                  <ScoreBar label="Simple" value={ss.simple} />
                  <ScoreBar label="Unexpected" value={ss.unexpected} />
                  <ScoreBar label="Concrete" value={ss.concrete} />
                  <ScoreBar label="Credible" value={ss.credible} />
                  <ScoreBar label="Emotional" value={ss.emotional} />
                  <ScoreBar label="Story" value={ss.story} />
                </div>
              )}

              {/* Campaign Line Tests */}
              {tests && (
                <div className="space-y-1 mb-3">
                  <h5 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Campaign Line Tests</h5>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <TestResult label="Bar Test" value={tests.barTest} />
                    <TestResult label="T-Shirt Test" value={tests.tShirtTest} />
                    <TestResult label="Parody Test" value={tests.parodyTest} />
                    <TestResult label="10-Year Test" value={tests.tenYearTest} />
                    <TestResult label="Cat. Escape" value={tests.categoryEscapeTest} />
                    <TestResult label="Opposite Test" value={tests.oppositeTest} />
                  </div>
                </div>
              )}

              {/* Memorable Device */}
              <div className="border-t border-gray-100 pt-2">
                <div className="flex items-start gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600 line-clamp-2">{concept.memorableDevice}</p>
                </div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 bg-teal-500 text-white rounded-full p-1">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Persona Comparison Matrix */}
      {personaValidation && personaValidation.length > 0 && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Persona Scores</h5>
          </div>
          <div className="p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500">
                  <th className="text-left pb-2 font-medium">Persona</th>
                  {labels.slice(0, concepts.length).map(l => (
                    <th key={l} className="text-center pb-2 font-medium w-20">Hook {l}</th>
                  ))}
                  <th className="text-center pb-2 font-medium w-20">Preferred</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {personaValidation.map((pv, pi) => {
                  const pvAny = pv as unknown as Record<string, unknown>;
                  const hookScores = [
                    pvAny.hookAScore as number | undefined,
                    pvAny.hookBScore as number | undefined,
                    pvAny.hookCScore as number | undefined,
                  ].slice(0, concepts.length);
                  const maxScore = Math.max(...hookScores.filter((s): s is number => typeof s === 'number'));
                  return (
                    <tr key={pi}>
                      <td className="py-2 text-gray-700 font-medium">{pv.personaName ?? `Persona ${pi + 1}`}</td>
                      {hookScores.map((score, si) => (
                        <td key={si} className="py-2 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${
                            typeof score === 'number' && score === maxScore
                              ? 'bg-emerald-100 text-emerald-700'
                              : typeof score === 'number' && score < 5
                                ? 'bg-red-50 text-red-600'
                                : 'bg-gray-100 text-gray-700'
                          }`}>
                            {typeof score === 'number' ? score : '\u2014'}
                          </span>
                        </td>
                      ))}
                      <td className="py-2 text-center">
                        <Badge variant={pv.preferredVariant === 'A' ? 'teal' : pv.preferredVariant === 'B' ? 'info' : 'warning'}>
                          {pv.preferredVariant ?? '\u2014'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Regenerate button */}
      {onRegenerate && (
        <div className="mt-6 text-center">
          <button
            type="button"
            className="text-sm text-gray-500 hover:text-gray-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? "Regenerating..." : "None of these \u2014 regenerate with different templates"}
          </button>
        </div>
      )}
    </div>
  );
}
