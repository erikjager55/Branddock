'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  FileText,
  Users,
  Zap,
  Target,
  ArrowLeft,
  Play,
  ShieldAlert,
  Package,
  TrendingUp,
  Sparkles,
  User,
} from 'lucide-react';
import { Badge, Button, Card, ProgressBar, Skeleton, SkeletonText } from '@/components/shared';
import { useComponentPipelineStore } from '@/lib/studio/stores/component-pipeline-store';
import type {
  BriefContextResponse,
  DeliverableBrief,
  AiContextPreview,
  BriefGap,
} from '@/types/studio';

// ─── Props ─────────────────────────────────────────────────

interface BriefReviewScreenProps {
  deliverableId: string;
  campaignId: string;
  onStartPipeline: () => void;
  onBack: () => void;
}

// ─── Constants ─────────────────────────────────────────────

const BRIEF_FIELD_LABELS: Record<keyof DeliverableBrief, string> = {
  objective: 'Objective',
  keyMessage: 'Key Message',
  toneDirection: 'Tone & Direction',
  cta: 'Call to Action',
  contentOutline: 'Content Outline',
  targetPersonas: 'Target Personas',
  channel: 'Channel',
  phase: 'Phase',
};

const SEVERITY_CONFIG: Record<
  BriefGap['severity'],
  { variant: 'danger' | 'warning' | 'info'; icon: React.ElementType; label: string }
> = {
  critical: { variant: 'danger', icon: ShieldAlert, label: 'Critical' },
  warning: { variant: 'warning', icon: AlertTriangle, label: 'Warning' },
  info: { variant: 'info', icon: Info, label: 'Info' },
};

// ─── Component ─────────────────────────────────────────────

/** Brief Review screen shown before pipeline initialization. */
export function BriefReviewScreen({
  deliverableId,
  campaignId,
  onStartPipeline,
  onBack,
}: BriefReviewScreenProps) {
  const setAdditionalInstructions = useComponentPipelineStore(
    (s) => s.setAdditionalInstructions,
  );
  const storedInstructions = useComponentPipelineStore(
    (s) => s.additionalInstructions,
  );

  const [dismissedCritical, setDismissedCritical] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['brief-context', deliverableId],
    queryFn: async () => {
      const res = await fetch(`/api/studio/${deliverableId}/brief-context`);
      if (!res.ok) throw new Error('Failed to load brief context');
      return res.json() as Promise<BriefContextResponse>;
    },
  });

  // Pre-fill additional instructions from API response on first load
  React.useEffect(() => {
    if (data?.additionalInstructions && !storedInstructions) {
      setAdditionalInstructions(data.additionalInstructions);
    }
  }, [data?.additionalInstructions, storedInstructions, setAdditionalInstructions]);

  const hasCriticalGaps = useMemo(
    () => data?.gaps.some((g) => g.severity === 'critical') ?? false,
    [data?.gaps],
  );

  const briefCompleteness = useMemo(() => {
    if (!data?.brief) return { filled: 0, total: 0 };
    const fields = Object.values(data.brief);
    const total = fields.length;
    const filled = fields.filter((v) => {
      if (v === null || v === undefined) return false;
      if (typeof v === 'string' && v.trim() === '') return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    }).length;
    return { filled, total };
  }, [data?.brief]);

  const canStart = !hasCriticalGaps || dismissedCritical;

  const handleInstructionsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setAdditionalInstructions(e.target.value);
    },
    [setAdditionalInstructions],
  );

  // ─── Loading state ─────────────────────────────────────

  if (isLoading) {
    return <BriefReviewSkeleton />;
  }

  // ─── Error state ───────────────────────────────────────

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <p className="text-sm text-gray-600">
          {error instanceof Error ? error.message : 'Failed to load brief context.'}
        </p>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-gray-900">Brief Review</h2>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left column: Brief + Instructions + Gaps */}
        <div className="md:col-span-8 space-y-6">
          <BriefOverviewCard brief={data.brief} />
          <AdditionalInstructionsCard
            value={storedInstructions}
            onChange={handleInstructionsChange}
          />
          {data.gaps.length > 0 && <GapWarningsCard gaps={data.gaps} />}
        </div>

        {/* Right column: AI Context + Completeness */}
        <div className="md:col-span-4 space-y-6">
          <AiContextCard context={data.aiContext} />
          <BriefCompletenessCard
            filled={briefCompleteness.filled}
            total={briefCompleteness.total}
          />
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={onBack}
        >
          Back
        </Button>

        <div className="flex items-center gap-3">
          {hasCriticalGaps && !dismissedCritical && (
            <button
              type="button"
              className="text-xs text-gray-500 hover:text-gray-700 underline transition-colors"
              onClick={() => setDismissedCritical(true)}
            >
              Dismiss warnings and proceed
            </button>
          )}
          <Button
            variant="primary"
            icon={Play}
            disabled={!canStart}
            onClick={onStartPipeline}
          >
            Start Pipeline
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Brief Overview Card ───────────────────────────────────

function BriefOverviewCard({ brief }: { brief: DeliverableBrief }) {
  return (
    <Card padding="none">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Deliverable Brief
        </h3>
      </div>
      <div className="px-5 pb-5 space-y-3">
        {(Object.keys(BRIEF_FIELD_LABELS) as Array<keyof DeliverableBrief>).map(
          (field) => (
            <BriefFieldRow
              key={field}
              label={BRIEF_FIELD_LABELS[field]}
              value={brief[field]}
            />
          ),
        )}
      </div>
    </Card>
  );
}

function BriefFieldRow({
  label,
  value,
}: {
  label: string;
  value: string | string[] | null;
}) {
  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0);

  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-b-0">
      <span className="text-xs font-medium text-gray-500 w-32 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <div className="flex-1 min-w-0">
        {isEmpty ? (
          <span className="text-xs text-gray-400 italic">(Not specified)</span>
        ) : Array.isArray(value) ? (
          <div className="flex flex-wrap gap-1.5">
            {value.map((item, idx) => (
              <Badge key={idx} variant="default" size="sm">
                {item}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-700">{value}</p>
        )}
      </div>
    </div>
  );
}

// ─── Additional Instructions Card ──────────────────────────

function AdditionalInstructionsCard({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <Card padding="none">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Additional Instructions
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Add any extra guidance for the AI content generation pipeline.
        </p>
      </div>
      <div className="px-5 pb-5">
        <textarea
          value={value}
          onChange={onChange}
          rows={4}
          placeholder="e.g. Focus on data-driven messaging, emphasize sustainability angle, keep tone conversational..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-colors"
        />
      </div>
    </Card>
  );
}

// ─── Gap Warnings Card ─────────────────────────────────────

function GapWarningsCard({ gaps }: { gaps: BriefGap[] }) {
  // Sort: critical first, then warning, then info
  const sortedGaps = useMemo(() => {
    const order: Record<BriefGap['severity'], number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };
    return [...gaps].sort((a, b) => order[a.severity] - order[b.severity]);
  }, [gaps]);

  return (
    <Card padding="none">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Brief Gaps
          <Badge variant="warning" size="sm">
            {gaps.length}
          </Badge>
        </h3>
      </div>
      <div className="px-5 pb-5 space-y-3">
        {sortedGaps.map((gap, idx) => {
          const config = SEVERITY_CONFIG[gap.severity];
          return (
            <div
              key={`${gap.field}-${idx}`}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
            >
              <config.icon className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-500" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={config.variant} size="sm">
                    {config.label}
                  </Badge>
                  <span className="text-xs font-medium text-gray-700">
                    {gap.field}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{gap.message}</p>
                {gap.suggestion && (
                  <p className="text-xs text-gray-500 italic">
                    Suggestion: {gap.suggestion}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── AI Context Card ───────────────────────────────────────

function AiContextCard({ context }: { context: AiContextPreview }) {
  return (
    <Card padding="none">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          AI Context Preview
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Data the AI will use during content generation.
        </p>
      </div>
      <div className="px-5 pb-5 space-y-4">
        {/* Brand info */}
        <div className="space-y-2">
          <ContextField label="Brand" value={context.brandName} />
          <ContextField label="Brand Voice" value={context.brandVoice} />
          <ContextField label="Archetype" value={context.archetype} />
        </div>

        {/* Competitors */}
        {context.competitors.length > 0 && (
          <div>
            <span className="text-xs font-medium text-gray-500 block mb-1.5">
              Competitors
            </span>
            <div className="flex flex-wrap gap-1.5">
              {context.competitors.map((c) => (
                <Badge key={c} variant="default" size="sm" icon={Target}>
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Active Trends */}
        {context.activeTrends.length > 0 && (
          <div>
            <span className="text-xs font-medium text-gray-500 block mb-1.5">
              Active Trends
            </span>
            <div className="flex flex-wrap gap-1.5">
              {context.activeTrends.map((t) => (
                <Badge key={t} variant="teal" size="sm" icon={TrendingUp}>
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Personas */}
        {context.personas.length > 0 && (
          <div>
            <span className="text-xs font-medium text-gray-500 block mb-1.5">
              Linked Personas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {context.personas.map((p) => (
                <Badge key={p.id} variant="info" size="sm" icon={User}>
                  {p.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        {context.products.length > 0 && (
          <div>
            <span className="text-xs font-medium text-gray-500 block mb-1.5">
              Products
            </span>
            <div className="flex flex-wrap gap-1.5">
              {context.products.map((p) => (
                <Badge key={p.id} variant="default" size="sm" icon={Package}>
                  {p.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Completeness */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">
              Context Completeness
            </span>
            <span className="text-xs font-semibold text-gray-700">
              {context.completenessPercentage}%
            </span>
          </div>
          <ProgressBar
            value={context.completenessPercentage}
            size="sm"
            color={context.completenessPercentage >= 70 ? 'teal' : context.completenessPercentage >= 40 ? 'amber' : 'red'}
            showLabel={false}
          />
        </div>
      </div>
    </Card>
  );
}

function ContextField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs font-medium text-gray-500 w-24 flex-shrink-0">
        {label}
      </span>
      {value ? (
        <span className="text-sm text-gray-700">{value}</span>
      ) : (
        <span className="text-xs text-gray-400 italic">(Not set)</span>
      )}
    </div>
  );
}

// ─── Brief Completeness Card ───────────────────────────────

function BriefCompletenessCard({
  filled,
  total,
}: {
  filled: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;

  return (
    <Card padding="none">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          Brief Completeness
        </h3>
      </div>
      <div className="px-5 pb-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {filled} of {total} fields filled
          </span>
          <span className="text-sm font-semibold text-gray-700">
            {percentage}%
          </span>
        </div>
        <ProgressBar
          value={percentage}
          size="md"
          color={percentage >= 75 ? 'emerald' : percentage >= 50 ? 'amber' : 'red'}
          showLabel={false}
        />
        {percentage < 50 && (
          <p className="text-xs text-amber-600">
            Consider filling more brief fields for better AI output quality.
          </p>
        )}
      </div>
    </Card>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────

function BriefReviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="rounded" width={20} height={20} />
        <Skeleton className="rounded" width={140} height={20} />
      </div>

      {/* 2-column skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 space-y-6">
          <Card padding="md">
            <Skeleton className="rounded mb-4" width={180} height={16} />
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="rounded" width={120} height={12} />
                  <Skeleton className="rounded flex-1" height={12} />
                </div>
              ))}
            </div>
          </Card>
          <Card padding="md">
            <Skeleton className="rounded mb-3" width={200} height={16} />
            <Skeleton className="rounded" width="100%" height={80} />
          </Card>
        </div>
        <div className="md:col-span-4 space-y-6">
          <Card padding="md">
            <Skeleton className="rounded mb-4" width={160} height={16} />
            <SkeletonText lines={5} />
          </Card>
          <Card padding="md">
            <Skeleton className="rounded mb-3" width={140} height={16} />
            <Skeleton className="rounded" width="100%" height={8} />
          </Card>
        </div>
      </div>

      {/* Bottom actions skeleton */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <Skeleton className="rounded" width={80} height={36} />
        <Skeleton className="rounded" width={140} height={36} />
      </div>
    </div>
  );
}
