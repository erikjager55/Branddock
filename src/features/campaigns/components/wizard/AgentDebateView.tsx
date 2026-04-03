'use client';

import { useMemo } from 'react';
import { Shield, Swords, Users, Sparkles, ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useCampaignWizardStore } from '../../stores/useCampaignWizardStore';
import { CritiqueCard } from './CritiqueCard';
import { DefenseCard } from './DefenseCard';
import { PersonaDebateCard } from './PersonaDebateCard';
import type { AgentDebateState, AgentRoundName } from '@/lib/campaigns/strategy-blueprint.types';

const ROUND_CONFIG: Record<AgentRoundName, { icon: typeof Shield; label: string; color: string }> = {
  generation: { icon: Sparkles, label: 'Variant Generation', color: 'text-blue-600' },
  critique: { icon: Shield, label: 'Critic Review', color: 'text-amber-600' },
  defense: { icon: Swords, label: 'Defense & Revision', color: 'text-violet-600' },
  persona_panel: { icon: Users, label: 'Persona Panel', color: 'text-teal-600' },
  synthesis: { icon: Sparkles, label: 'Final Synthesis', color: 'text-emerald-600' },
};

function RoundStatusIcon({ status }: { status: AgentDebateState['status'] }) {
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
  if (status === 'complete') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === 'error') return <XCircle className="h-4 w-4 text-red-500" />;
  return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
}

export function AgentDebateView() {
  const agentDebateRounds = useCampaignWizardStore((s) => s.agentDebateRounds);
  const critiqueOfA = useCampaignWizardStore((s) => s.critiqueOfA);
  const critiqueOfB = useCampaignWizardStore((s) => s.critiqueOfB);
  const defenseA = useCampaignWizardStore((s) => s.defenseA);
  const defenseB = useCampaignWizardStore((s) => s.defenseB);
  const personaDebate = useCampaignWizardStore((s) => s.personaDebate);

  const roundStates = useMemo(() => {
    const map = new Map<AgentRoundName, AgentDebateState>();
    for (const r of agentDebateRounds) map.set(r.round, r);
    return map;
  }, [agentDebateRounds]);

  const rounds: AgentRoundName[] = ['generation', 'critique', 'defense', 'persona_panel', 'synthesis'];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Multi-Agent Strategy Debate</h3>
      <div className="space-y-2">
        {rounds.map((roundName) => {
          const config = ROUND_CONFIG[roundName];
          const state = roundStates.get(roundName);
          const status = state?.status ?? 'pending';
          const isComplete = status === 'complete';
          const isRunning = status === 'running';
          const Icon = config.icon;

          return (
            <div key={roundName} className={`rounded-lg border ${isRunning ? 'border-blue-200 bg-blue-50/50' : isComplete ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50/50'}`}>
              {/* Round header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <RoundStatusIcon status={status} />
                <Icon className={`h-4 w-4 ${isComplete || isRunning ? config.color : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${isComplete || isRunning ? 'text-gray-900' : 'text-gray-400'}`}>
                  {config.label}
                </span>
                {isRunning && (
                  <span className="text-xs text-blue-600 ml-auto">Analyzing...</span>
                )}
                {isComplete && (
                  <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
                )}
                {status === 'pending' && (
                  <span className="text-xs text-gray-400 ml-auto">Waiting</span>
                )}
              </div>

              {/* Expanded content for completed rounds */}
              {isComplete && roundName === 'critique' && critiqueOfA && critiqueOfB && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <CritiqueCard critique={critiqueOfA} variantLabel="Variant A (Strategist)" />
                    <CritiqueCard critique={critiqueOfB} variantLabel="Variant B (Creative)" />
                  </div>
                </div>
              )}

              {isComplete && roundName === 'defense' && defenseA && defenseB && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <DefenseCard defense={defenseA} variantLabel="Variant A (Strategist)" />
                    <DefenseCard defense={defenseB} variantLabel="Variant B (Creative)" />
                  </div>
                </div>
              )}

              {isComplete && roundName === 'persona_panel' && personaDebate && personaDebate.length > 0 && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="space-y-3 mt-3">
                    {personaDebate.map((pd) => (
                      <PersonaDebateCard key={pd.personaId} result={pd} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
