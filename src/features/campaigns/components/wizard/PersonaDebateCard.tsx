'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, AlertOctagon, MessageSquareQuote } from 'lucide-react';
import type { PersonaDebateResult } from '@/lib/campaigns/strategy-blueprint.types';

const SCORE_BAR_COLOR = (score: number) => {
  if (score >= 8) return 'bg-emerald-500';
  if (score >= 6) return 'bg-amber-500';
  return 'bg-red-400';
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-gray-500 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
        <div className={`h-full rounded-full ${SCORE_BAR_COLOR(score)}`} style={{ width: `${(score / 10) * 100}%` }} />
      </div>
      <span className="w-5 text-right text-gray-600 font-medium">{score}</span>
    </div>
  );
}

interface PersonaDebateCardProps {
  result: PersonaDebateResult;
}

export function PersonaDebateCard({ result }: PersonaDebateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const reactions = result.variantReactions ?? [];

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{result.personaName}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              result.preferredVariant === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
            }`}>
              Prefers {result.preferredVariant}
              {result.preferenceStrength === 'strong' && ' (strongly)'}
              {result.preferenceStrength === 'indifferent' && ' (barely)'}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">{result.creativeVerdict}</p>
        </div>

        {/* Dealbreaker indicator */}
        {result.dealbreaker && (
          <span title="Has dealbreaker"><AlertOctagon className="h-4 w-4 text-red-500 flex-shrink-0" /></span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-4">
          {/* Creative scores */}
          <div className="mt-3 space-y-1.5">
            <ScoreBar label="Originality" score={result.originalityScore ?? 5} />
            <ScoreBar label="Memorability" score={result.memorabilityScore ?? 5} />
            <ScoreBar label="Cultural relevance" score={result.culturalRelevanceScore ?? 5} />
            <ScoreBar label="Talkability" score={result.talkabilityScore ?? 5} />
          </div>

          {/* Dealbreaker */}
          {result.dealbreaker && (
            <div className="p-2 rounded bg-red-50 border border-red-200 text-xs text-red-800">
              <span className="font-medium">Dealbreaker: </span>{result.dealbreaker}
            </div>
          )}

          {/* Per-variant reactions */}
          {reactions.map((reaction) => (
            <div key={reaction.variant} className={`rounded-lg border p-3 ${
              reaction.variant === 'A' ? 'border-blue-200 bg-blue-50/30' : 'border-violet-200 bg-violet-50/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold ${reaction.variant === 'A' ? 'text-blue-700' : 'text-violet-700'}`}>
                  Variant {reaction.variant}
                </span>
                {reaction.wouldEngage ? (
                  <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                )}
                <span className="text-xs text-gray-500">{reaction.wouldEngage ? 'Would engage' : 'Would not engage'}</span>
              </div>

              <p className="text-xs text-gray-700 italic mb-2">"{reaction.firstImpression}"</p>

              <div className="text-xs space-y-1.5">
                <p><span className="font-medium text-gray-600">Why: </span>{reaction.engagementReason}</p>
                <p><span className="font-medium text-gray-600">Emotional response: </span>{reaction.emotionalResponse}</p>
                {reaction.channelPreference && (
                  <p><span className="font-medium text-gray-600">Preferred channel: </span>{reaction.channelPreference}</p>
                )}

                {/* Barriers & Triggers */}
                {(reaction.barriers?.length > 0 || reaction.triggers?.length > 0) && (
                  <div className="flex gap-3 mt-1">
                    {reaction.barriers?.length > 0 && (
                      <div className="flex-1">
                        <p className="font-medium text-red-600 mb-0.5">Barriers</p>
                        <div className="flex flex-wrap gap-1">
                          {reaction.barriers.map((b, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-red-100 text-red-700">{b}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {reaction.triggers?.length > 0 && (
                      <div className="flex-1">
                        <p className="font-medium text-emerald-600 mb-0.5">Triggers</p>
                        <div className="flex flex-wrap gap-1">
                          {reaction.triggers.map((t, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Message rewrite */}
                {reaction.messageRewrite && (
                  <div className="mt-2 p-2 rounded bg-white border border-gray-200">
                    <div className="flex items-center gap-1 mb-1">
                      <MessageSquareQuote className="h-3 w-3 text-gray-400" />
                      <span className="font-medium text-gray-600">How I'd say it:</span>
                    </div>
                    <p className="text-gray-800 italic">"{reaction.messageRewrite}"</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
