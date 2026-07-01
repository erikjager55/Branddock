'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertTriangle, ShieldOff, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/shared';
import {
  useContentReadiness,
  usePublishWithOverride,
} from '../../hooks/content-readiness.hooks';
import type { ContentReadiness } from '../../api/content-readiness.api';
import { trackBrowserEvent } from '@/lib/analytics/posthog-browser';
import {
  useInternalFindings,
  type InternalFindingsResponse,
} from '@/hooks/useInternalFindings';
import { useUIState } from '@/contexts/UIStateContext';
import { useBrandAlignmentStore } from '@/stores/useBrandAlignmentStore';
import type { BrandReviewSeverity } from '@prisma/client';

interface PublishGateProps {
  deliverableId: string;
  /** Forwarded to /publish — caller's existing publish flow stays. */
  onPublish: () => void;
  /** True while the caller's publish-mutation is in flight. */
  isPublishing?: boolean;
  /** When publishing via a connected channel (linkedin etc.), pass the platform. */
  publishedVia?: string;
}

/**
 * Wraps the publish button with a fidelity-score-based QA gate.
 *
 * - score >= threshold → green badge, publish enabled
 * - score < threshold  → red badge, publish disabled, "Override..." opens modal
 * - no score / no version → yellow badge ("nog niet gescoord"), publish enabled
 *   (failsafe-open — missing data shouldn't brick publish)
 *
 * The caller owns the regular publish flow via `onPublish`. Override is fully
 * internal: this component handles its own mutation + modal + event-emitting.
 */
export function PublishGate({
  deliverableId,
  onPublish,
  isPublishing,
  publishedVia,
}: PublishGateProps) {
  const { t } = useTranslation('campaigns-canvas');
  const { data, isLoading } = useContentReadiness(deliverableId);
  const overrideMutation = usePublishWithOverride(deliverableId);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Fire content_qa_gate_blocked exactly once per below-threshold transition
  // (mount or score-change to below-threshold). Reason-flag lets the
  // dashboard slice between real blocks and other failsafe states.
  const lastBlockedScoreRef = useRef<string | null>(null);
  useEffect(() => {
    if (data?.canPublish === false && data.reason === 'below-threshold') {
      const fingerprint = `${data.latestScore?.id ?? 'no-id'}`;
      if (lastBlockedScoreRef.current !== fingerprint) {
        lastBlockedScoreRef.current = fingerprint;
        void trackBrowserEvent('content_qa_gate_blocked', {
          deliverable_id: deliverableId,
          composite_score: data.latestScore?.compositeScore,
          threshold: data.latestScore?.threshold,
          judge: data.latestScore?.judgeIdentifier,
        });
      }
    } else {
      lastBlockedScoreRef.current = null;
    }
  }, [data, deliverableId]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">{t('publishGate.readinessCheck')}</span>
      </div>
    );
  }

  const blocked = !data.canPublish;
  const noScoreYet = data.reason === 'no-score' || data.reason === 'no-version';
  const blockedTitle = data.latestScore
    ? t('publishGate.blockedTooltipScore', {
        score: Math.round(data.latestScore.compositeScore),
        threshold: data.latestScore.threshold,
      })
    : t('publishGate.blockedTooltipGeneric');

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <ReadinessBadge readiness={data} />
          {blocked ? (
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" disabled title={blockedTitle}>
                {t('publishGate.publish')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void trackBrowserEvent('content_qa_override_modal_opened', {
                    deliverable_id: deliverableId,
                    composite_score: data.latestScore?.compositeScore,
                    threshold: data.latestScore?.threshold,
                  });
                  setShowOverrideModal(true);
                }}
              >
                {t('publishGate.override')}
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="sm" onClick={onPublish} disabled={isPublishing}>
              {isPublishing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  {t('publishGate.publishing')}
                </>
              ) : noScoreYet ? (
                t('publishGate.publishWithoutScore')
              ) : (
                t('publishGate.publish')
              )}
            </Button>
          )}
        </div>

        {/* Δ-1 Surface E findings-block — alleen bij below-threshold + beschikbare
            fidelity-score-id. Toont concrete issues zodat user gemotiveerd is om
            te fixen ipv direct overriden. `key` op fidelityScoreId zorgt dat de
            expanded/collapsed state reset bij regenerate (nieuwe score-id =
            nieuwe finding-set, geen mengeling van oude collapsed-keuze). */}
        {blocked && data.latestScore?.id && (
          <FindingsBlock
            key={data.latestScore.id}
            fidelityScoreId={data.latestScore.id}
          />
        )}
      </div>

      {showOverrideModal && (
        <OverrideModal
          readiness={data}
          isPending={overrideMutation.isPending}
          publishedVia={publishedVia}
          onCancel={() => setShowOverrideModal(false)}
          onConfirm={async (reason) => {
            try {
              await overrideMutation.mutateAsync({ reason, publishNow: true, publishedVia });
              void trackBrowserEvent('content_qa_override_fired', {
                deliverable_id: deliverableId,
                composite_score: data.latestScore?.compositeScore,
                threshold: data.latestScore?.threshold,
                reason_length: reason.length,
              });
              setShowOverrideModal(false);
            } catch (err) {
              console.error('[PublishGate override failed]', err);
            }
          }}
        />
      )}
    </>
  );
}

/**
 * Δ-1 Surface E findings-block — toont top-3 HIGH-severity findings boven
 * de override-button zodat user concrete issues ziet vóór de keuze om te
 * overriden of fixen. Graceful op alle data-states (loading / error / empty
 * findings / score zonder findings — auto-trigger persist is async dus
 * findings kunnen even na de score landen).
 */
// Typed Records zodat een toekomstige BrandReviewSeverity / FindingCategory
// enum-waarde een TS-error oplevert in plaats van een silent missing-key.
const SEVERITY_PILL: Record<BrandReviewSeverity, string> = {
  HIGH: 'bg-red-100 text-red-800 border-red-200',
  MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
  LOW: 'bg-gray-100 text-gray-700 border-gray-200',
};

const TOP_FINDINGS_LIMIT = 3;

function FindingsBlock({ fidelityScoreId }: { fidelityScoreId: string }) {
  const { t } = useTranslation('campaigns-canvas');
  const { data, isLoading, isError } = useInternalFindings(fidelityScoreId);
  const [expanded, setExpanded] = useState(true);

  // Loading-state — score is er, findings nog niet gepersist of in flight.
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 inline-flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t('publishGate.loadingFindings')}
      </div>
    );
  }

  // Error of ontbrekende findings — async persist kan gefaald zijn (graceful
  // degradatie per fidelity-runner.ts comment). Geen findings-block tonen,
  // de ReadinessBadge + override-flow blijft volledig functioneel.
  if (isError || !data || data.findingsCount === 0) {
    return null;
  }

  return <FindingsBlockContent data={data} expanded={expanded} setExpanded={setExpanded} />;
}

function FindingsBlockContent({
  data,
  expanded,
  setExpanded,
}: {
  data: InternalFindingsResponse;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}) {
  const { t } = useTranslation('campaigns-canvas');
  const top = data.findings.slice(0, TOP_FINDINGS_LIMIT);
  const remaining = data.findingsCount - top.length;

  const { setActiveSection } = useUIState();
  const openReviewByFidelityScoreId = useBrandAlignmentStore(
    (s) => s.openReviewByFidelityScoreId,
  );

  // SPA-transition naar Brand Alignment → Content Review tab met deze
  // fidelity-score pre-loaded. Pre-load via Zustand-store (hybrid-SPA pad
  // ondersteunt geen URL-params voor pagina-routing).
  const handleViewAll = () => {
    openReviewByFidelityScoreId(data.fidelityScoreId);
    setActiveSection('brand-alignment');
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-amber-900 hover:bg-amber-100/50"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>
          {t('publishGate.findingsSummary', { count: data.findingsCount })}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-amber-200/70">
          <div className="text-[10px] uppercase tracking-wide text-amber-700/70 font-medium">
            {t('publishGate.topOf', { shown: top.length, total: data.findingsCount })}
          </div>
          {top.map((f) => (
            <div key={f.id} className="flex gap-2 items-start text-xs">
              <span
                className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border ${SEVERITY_PILL[f.severity]}`}
              >
                {f.severity}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-gray-800 break-words">
                  <span className="text-gray-500">
                    {t(`publishGate.findingCategory.${f.category}`)}:
                  </span>{' '}
                  {f.description}
                </div>
                {f.suggestion && (
                  <div className="text-emerald-700 mt-0.5 break-words">
                    → {f.suggestion}
                  </div>
                )}
              </div>
            </div>
          ))}
          {remaining > 0 && (
            <div className="text-[11px] pt-1 border-t border-amber-200/70">
              <button
                type="button"
                onClick={handleViewAll}
                className="text-amber-800 hover:text-amber-900 hover:underline"
              >
                {t('publishGate.seeAllMore', { count: remaining })}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReadinessBadge({ readiness }: { readiness: ContentReadiness }) {
  const { t } = useTranslation('campaigns-canvas');
  if (readiness.canPublish && readiness.reason === 'ready') {
    const score = Math.round(readiness.latestScore?.compositeScore ?? 0);
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs">
        <CheckCircle2 className="h-3 w-3" />
        {t('publishGate.scoreBadge', { score })}
      </span>
    );
  }
  if (readiness.canPublish) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs">
        <AlertTriangle className="h-3 w-3" />
        {t('publishGate.notScored')}
      </span>
    );
  }
  const score = Math.round(readiness.latestScore?.compositeScore ?? 0);
  const threshold = readiness.latestScore?.threshold ?? 70;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs">
      <ShieldOff className="h-3 w-3" />
      {t('publishGate.scoreThreshold', { score, threshold })}
    </span>
  );
}

function OverrideModal({
  readiness,
  isPending,
  publishedVia,
  onConfirm,
  onCancel,
}: {
  readiness: ContentReadiness;
  isPending: boolean;
  publishedVia?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation('campaigns-canvas');
  const [reason, setReason] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isValid = reason.trim().length >= 10;
  const score = readiness.latestScore?.compositeScore;
  const threshold = readiness.latestScore?.threshold;

  // Auto-focus reden-veld bij open + close-on-Escape voor a11y baseline.
  useEffect(() => {
    textareaRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel, isPending]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        // Backdrop click sluit (alleen als click op backdrop zelf, niet op modal-inhoud)
        if (e.target === e.currentTarget && !isPending) onCancel();
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="override-modal-title"
      >
        <div className="flex items-start gap-3 mb-4">
          <ShieldOff className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 id="override-modal-title" className="text-base font-semibold text-gray-900">
              {t('publishGate.overrideTitle')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {score !== undefined && threshold !== undefined ? (
                <>
                  {t('publishGate.overrideDescPrefix')} <strong>{Math.round(score)}</strong>
                  {t('publishGate.overrideDescMid')} <strong>{threshold}</strong>
                  {t('publishGate.overrideDescSuffix')}
                </>
              ) : (
                t('publishGate.overrideDescGeneric')
              )}
            </p>
          </div>
        </div>

        <label htmlFor="override-reason" className="block text-sm font-medium text-gray-700 mb-1">
          {t('publishGate.reasonLabel')}
        </label>
        <textarea
          id="override-reason"
          ref={textareaRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={t('publishGate.reasonPlaceholder')}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          disabled={isPending}
        />
        <p className="text-xs text-gray-500 mt-1">
          {t('publishGate.auditNote')}
        </p>

        {publishedVia && (
          <p className="text-xs text-gray-500 mt-3">
            {t('publishGate.distributionVia')} <code className="text-gray-700">{publishedVia}</code>
          </p>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={isPending}>
            {t('actions.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm(reason.trim())}
            disabled={!isValid || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                {t('publishGate.override')}
              </>
            ) : (
              t('publishGate.confirmOverride')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
