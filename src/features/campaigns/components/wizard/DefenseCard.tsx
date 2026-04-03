'use client';

import { CheckCircle2, Shield, RefreshCw } from 'lucide-react';
import type { AgentDefense, DefenseResponse } from '@/lib/campaigns/strategy-blueprint.types';

const RESPONSE_STYLES: Record<DefenseResponse, { label: string; color: string; bgColor: string }> = {
  accepted: { label: 'Accepted', color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
  defended: { label: 'Defended', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  partially_accepted: { label: 'Partial', color: 'text-amber-700', bgColor: 'bg-amber-50' },
};

interface DefenseCardProps {
  defense: AgentDefense;
  variantLabel: string;
}

export function DefenseCard({ defense, variantLabel }: DefenseCardProps) {
  const addressed = defense.addressedWeaknesses ?? [];
  const revised = defense.revisedElements ?? [];
  const changeLog = defense.changeLog ?? [];
  const blindSpots = defense.addressedBlindSpots ?? [];

  const acceptedCount = addressed.filter(w => w.response === 'accepted').length;
  const defendedCount = addressed.filter(w => w.response === 'defended').length;
  const partialCount = addressed.filter(w => w.response === 'partially_accepted').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">{variantLabel}</h4>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {acceptedCount > 0 && <span className="text-emerald-600">{acceptedCount} accepted</span>}
          {defendedCount > 0 && <span className="text-blue-600">{defendedCount} defended</span>}
          {partialCount > 0 && <span className="text-amber-600">{partialCount} partial</span>}
        </div>
      </div>

      {/* Addressed weaknesses */}
      {addressed.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1">Responses to Critique</p>
          <div className="space-y-1.5">
            {addressed.map((w, i) => {
              const style = RESPONSE_STYLES[w.response] ?? RESPONSE_STYLES.accepted;
              return (
                <div key={i} className={`text-xs p-2 rounded border border-gray-200 ${style.bgColor}`}>
                  <div className="flex items-start gap-1.5">
                    <Shield className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${style.color}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${style.color}`}>{style.label}</span>
                        <span className="text-gray-500">{w.originalWeakness}</span>
                      </div>
                      <p className="mt-0.5 text-gray-700">{w.reasoning}</p>
                      {w.action && <p className="mt-1 text-gray-600">Action: {w.action}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Revised elements — diff view */}
      {revised.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5" /> Changes Made ({revised.length})</p>
          <div className="space-y-1.5">
            {revised.map((r, i) => (
              <div key={i} className="text-xs p-2 rounded border border-gray-200 bg-white">
                <p className="font-medium text-gray-800">{r.field}</p>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <div className="p-1.5 rounded bg-red-50 text-red-700 line-through">{r.before}</div>
                  <div className="p-1.5 rounded bg-emerald-50 text-emerald-700">{r.after}</div>
                </div>
                <p className="mt-1 text-gray-500 italic">{r.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Addressed blind spots */}
      {blindSpots.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1">Blind Spots Addressed</p>
          <ul className="text-xs text-gray-600 space-y-1 pl-4 list-disc">
            {blindSpots.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      )}

      {/* Change log summary */}
      {changeLog.length > 0 && (
        <div className="border-t border-gray-100 pt-2">
          <p className="text-xs font-medium text-gray-500 mb-1">Change Log</p>
          <ul className="text-xs text-gray-500 space-y-0.5">
            {changeLog.map((c, i) => (
              <li key={i} className="flex items-start gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
