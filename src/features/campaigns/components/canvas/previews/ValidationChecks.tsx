'use client';

import React from 'react';
import type {
  CharCountCheckResult,
  ToneCheckResult,
  BrandVoiceCheckResult,
  ValidationStatus,
  PreviewContent,
} from '../../../types/canvas.types';
import type { MediumContext } from '@/lib/ai/canvas-context';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface ValidationChecksProps {
  previewContent: PreviewContent;
  medium: MediumContext | null;
}

const STATUS_CONFIG: Record<ValidationStatus, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  pass: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  warn: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  fail: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
};

function getCharCountChecks(previewContent: PreviewContent, medium: MediumContext | null): CharCountCheckResult[] {
  const specs = medium?.specs ?? {};
  const results: CharCountCheckResult[] = [];

  for (const [group, value] of Object.entries(previewContent)) {
    if (value.type !== 'text' || !value.content) continue;

    const charCount = value.content.length;
    const limitKey = `${group}_max_chars`;
    const limit = typeof specs[limitKey] === 'number' ? (specs[limitKey] as number) : null;

    if (limit === null) continue;

    const percentage = Math.round((charCount / limit) * 100);
    let status: ValidationStatus = 'pass';
    if (percentage > 100) status = 'fail';
    else if (percentage > 80) status = 'warn';

    results.push({ variantGroup: group, charCount, limit, percentage, status });
  }

  return results;
}

function getToneCheck(previewContent: PreviewContent): ToneCheckResult {
  const hasContent = Object.values(previewContent).some(
    (v) => v.type === 'text' && v.content && v.content.length > 0
  );

  if (!hasContent) {
    return { status: 'warn', message: 'No text content to check' };
  }

  // TODO: Implement real tone analysis (Fase E)
  return { status: 'warn', message: 'Tone analysis coming soon' };
}

function getBrandVoiceCheck(): BrandVoiceCheckResult {
  // TODO: Implement real brand voice scoring (Fase E)
  return { score: 0, alignment: 'Pending' };
}

/** Validation panel showing character counts, tone check, and brand voice alignment */
export function ValidationChecks({ previewContent, medium }: ValidationChecksProps) {
  const charChecks = getCharCountChecks(previewContent, medium);
  const toneCheck = getToneCheck(previewContent);
  const brandVoice = getBrandVoiceCheck();

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Validation
      </h3>

      {/* Character count checks */}
      {charChecks.length > 0 && (
        <div className="space-y-2">
          {charChecks.map((check) => {
            const cfg = STATUS_CONFIG[check.status];
            const Icon = cfg.icon;
            return (
              <div
                key={check.variantGroup}
                className={`flex items-center gap-2 p-2 rounded-lg ${cfg.bg}`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 capitalize">
                    {check.variantGroup.replace(/_/g, ' ')}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          check.status === 'pass'
                            ? 'bg-emerald-500'
                            : check.status === 'warn'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(check.percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 flex-shrink-0">
                      {check.charCount}/{check.limit}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {charChecks.length === 0 && (
        <p className="text-xs text-gray-400 italic">
          No character limits defined for this format
        </p>
      )}

      {/* Tone check */}
      <div className={`flex items-center gap-2 p-2 rounded-lg ${STATUS_CONFIG[toneCheck.status].bg}`}>
        {React.createElement(STATUS_CONFIG[toneCheck.status].icon, {
          className: `h-4 w-4 flex-shrink-0 ${STATUS_CONFIG[toneCheck.status].color}`,
        })}
        <div>
          <p className="text-xs font-medium text-gray-700">Tone Check</p>
          <p className="text-[10px] text-gray-500">{toneCheck.message}</p>
        </div>
      </div>

      {/* Brand voice alignment */}
      <div className="p-2 rounded-lg bg-gray-50">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-gray-700">Brand Voice</p>
          <span className={`text-xs font-semibold ${
            brandVoice.alignment === 'Strong'
              ? 'text-emerald-600'
              : brandVoice.alignment === 'Moderate'
              ? 'text-amber-600'
              : brandVoice.alignment === 'Pending'
              ? 'text-gray-400'
              : 'text-red-600'
          }`}>
            {brandVoice.alignment}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-gray-200">
            <div
              className={`h-1.5 rounded-full ${
                brandVoice.score >= 80
                  ? 'bg-emerald-500'
                  : brandVoice.score >= 60
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${brandVoice.score}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500">{brandVoice.score}%</span>
        </div>
      </div>
    </div>
  );
}
