'use client';

import React, { useState, useEffect, useRef } from 'react';
import type {
  CharCountCheckResult,
  ToneCheckResult,
  BrandVoiceCheckResult,
  ValidationStatus,
  PreviewContent,
} from '../../../types/canvas.types';
import type { MediumContext } from '@/lib/ai/canvas-context';
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

interface ValidationChecksProps {
  previewContent: PreviewContent;
  medium: MediumContext | null;
  deliverableId: string | null;
}

interface ToneCheckApiResponse {
  toneCheck: ToneCheckResult;
  brandVoice: BrandVoiceCheckResult;
  details: string[];
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

/** Extract text content from preview for the API call */
function extractTextContent(previewContent: PreviewContent): Record<string, string> | null {
  const content: Record<string, string> = {};
  for (const [group, value] of Object.entries(previewContent)) {
    if (value.type === 'text' && value.content && value.content.length > 0) {
      content[group] = value.content;
    }
  }
  return Object.keys(content).length > 0 ? content : null;
}

/** Validation panel showing character counts, tone check, and brand voice alignment */
export function ValidationChecks({ previewContent, medium, deliverableId }: ValidationChecksProps) {
  const charChecks = getCharCountChecks(previewContent, medium);

  // Derive a stable string key from content so useEffect triggers reliably
  const contentKey = React.useMemo(() => {
    const parts: string[] = [];
    for (const [group, value] of Object.entries(previewContent)) {
      if (value.type === 'text' && value.content) {
        parts.push(`${group}:${value.content}`);
      }
    }
    return parts.join('|');
  }, [previewContent]);

  const [toneCheck, setToneCheck] = useState<ToneCheckResult>({ status: 'warn', message: 'Waiting for content...' });
  const [brandVoice, setBrandVoice] = useState<BrandVoiceCheckResult>({ score: 0, alignment: 'Pending' });
  const [details, setDetails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Keep previewContent in a ref so useEffect reads latest without needing it as dep
  const previewRef = useRef(previewContent);
  previewRef.current = previewContent;

  useEffect(() => {
    const textContent = extractTextContent(previewRef.current);

    if (!textContent || !deliverableId) {
      setToneCheck({ status: 'warn', message: 'No text content to check' });
      setBrandVoice({ score: 0, alignment: 'Pending' });
      setDetails([]);
      return;
    }

    setIsLoading(true);

    const debounceTimer = setTimeout(() => {
      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetch(`/api/studio/${deliverableId}/tone-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textContent }),
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<ToneCheckApiResponse>;
        })
        .then((data) => {
          if (!controller.signal.aborted) {
            setToneCheck(data.toneCheck);
            setBrandVoice(data.brandVoice);
            setDetails(data.details ?? []);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          console.error('[ValidationChecks] tone-check failed:', err);
          if (!controller.signal.aborted) {
            setToneCheck({ status: 'warn', message: 'Tone check unavailable' });
            setBrandVoice({ score: 0, alignment: 'Pending' });
            setDetails([]);
            setIsLoading(false);
          }
        });
    }, 1500);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [contentKey, deliverableId]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

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
      {isLoading ? (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
          <Loader2 className="h-4 w-4 flex-shrink-0 text-gray-400 animate-spin" />
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-700">Tone Check</p>
            <div className="mt-1 space-y-1">
              <div className="h-2 w-3/4 rounded bg-gray-200 animate-pulse" />
              <div className="h-2 w-1/2 rounded bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex items-center gap-2 p-2 rounded-lg ${STATUS_CONFIG[toneCheck.status].bg}`}>
          {React.createElement(STATUS_CONFIG[toneCheck.status].icon, {
            className: `h-4 w-4 flex-shrink-0 ${STATUS_CONFIG[toneCheck.status].color}`,
          })}
          <div>
            <p className="text-xs font-medium text-gray-700">Tone Check</p>
            <p className="text-[10px] text-gray-500">{toneCheck.message}</p>
          </div>
        </div>
      )}

      {/* Brand voice alignment */}
      {isLoading ? (
        <div className="p-2 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-gray-700">Brand Voice</p>
            <div className="h-3 w-12 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-3 w-6 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
      ) : (
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
                className={`h-1.5 rounded-full transition-all ${
                  brandVoice.score >= 80
                    ? 'bg-emerald-500'
                    : brandVoice.score >= 60
                    ? 'bg-amber-500'
                    : brandVoice.alignment === 'Pending'
                    ? 'bg-gray-300'
                    : 'bg-red-500'
                }`}
                style={{ width: `${brandVoice.score}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500">{brandVoice.score}%</span>
          </div>
        </div>
      )}

      {/* Detail items (violations + suggestions) */}
      {details.length > 0 && !isLoading && (
        <div className="space-y-1">
          {details.map((detail, i) => (
            <p key={i} className="text-[10px] text-gray-500 pl-2 border-l-2 border-gray-200">
              {detail}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
