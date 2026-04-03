'use client';

import { AlertTriangle, CheckCircle2, Eye, ShieldAlert } from 'lucide-react';
import type { AgentCritique, CritiquePoint, CritiqueRisk } from '@/lib/campaigns/strategy-blueprint.types';

const SEVERITY_STYLES = {
  critical: 'bg-red-50 border-red-200 text-red-800',
  moderate: 'bg-amber-50 border-amber-200 text-amber-800',
  minor: 'bg-gray-50 border-gray-200 text-gray-600',
} as const;

const LIKELIHOOD_DOT = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-gray-400',
} as const;

function PointItem({ point, type }: { point: CritiquePoint; type: 'strength' | 'weakness' }) {
  return (
    <div className={`text-xs p-2 rounded border ${type === 'strength' ? 'bg-emerald-50 border-emerald-200' : SEVERITY_STYLES[point.severity]}`}>
      <div className="flex items-start gap-1.5">
        {type === 'strength' ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        )}
        <div>
          <span className="font-medium">{point.element}</span>
          <p className="mt-0.5 text-gray-700">{point.observation}</p>
          {point.evidence && <p className="mt-1 text-gray-500 italic">{point.evidence}</p>}
        </div>
      </div>
    </div>
  );
}

function RiskItem({ risk }: { risk: CritiqueRisk }) {
  return (
    <div className="text-xs p-2 rounded border border-gray-200 bg-white">
      <div className="flex items-start gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{risk.risk}</span>
            <span className={`inline-block h-2 w-2 rounded-full ${LIKELIHOOD_DOT[risk.likelihood]}`} title={`Likelihood: ${risk.likelihood}`} />
          </div>
          <p className="mt-0.5 text-gray-600">{risk.impact}</p>
          <p className="mt-1 text-emerald-700">Mitigation: {risk.mitigation}</p>
        </div>
      </div>
    </div>
  );
}

interface CritiqueCardProps {
  critique: AgentCritique;
  variantLabel: string;
}

export function CritiqueCard({ critique, variantLabel }: CritiqueCardProps) {
  const strengths = critique.strengths ?? [];
  const weaknesses = critique.weaknesses ?? [];
  const blindSpots = critique.blindSpots ?? [];
  const risks = critique.risks ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">{variantLabel}</h4>
        <span className="text-xs text-gray-500">Confidence: {critique.confidenceScore}/10</span>
      </div>

      {/* Strengths */}
      {strengths.length > 0 && (
        <div>
          <p className="text-xs font-medium text-emerald-700 mb-1">Strengths ({strengths.length})</p>
          <div className="space-y-1.5">{strengths.map((s, i) => <PointItem key={i} point={s} type="strength" />)}</div>
        </div>
      )}

      {/* Weaknesses */}
      {weaknesses.length > 0 && (
        <div>
          <p className="text-xs font-medium text-red-700 mb-1">Weaknesses ({weaknesses.length})</p>
          <div className="space-y-1.5">{weaknesses.map((w, i) => <PointItem key={i} point={w} type="weakness" />)}</div>
        </div>
      )}

      {/* Blind Spots */}
      {blindSpots.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Blind Spots</p>
          <ul className="text-xs text-gray-600 space-y-1 pl-4 list-disc">
            {blindSpots.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <div>
          <p className="text-xs font-medium text-red-600 mb-1">Risks ({risks.length})</p>
          <div className="space-y-1.5">{risks.map((r, i) => <RiskItem key={i} risk={r} />)}</div>
        </div>
      )}

      {/* Differentiation gap */}
      {critique.differentiationGap && (
        <div className="text-xs p-2 rounded bg-violet-50 border border-violet-200 text-violet-800">
          <span className="font-medium">Convergence gap: </span>{critique.differentiationGap}
        </div>
      )}

      {/* Overall assessment */}
      <p className="text-xs text-gray-600 italic border-t border-gray-100 pt-2">{critique.overallAssessment}</p>
    </div>
  );
}
