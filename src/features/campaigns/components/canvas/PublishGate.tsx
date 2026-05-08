'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertTriangle, ShieldOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/shared';
import {
  useContentReadiness,
  usePublishWithOverride,
} from '../../hooks/content-readiness.hooks';
import type { ContentReadiness } from '../../api/content-readiness.api';
import { trackBrowserEvent } from '@/lib/analytics/posthog-browser';

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
        <span className="text-sm text-gray-500">Readiness check…</span>
      </div>
    );
  }

  const blocked = !data.canPublish;
  const noScoreYet = data.reason === 'no-score' || data.reason === 'no-version';

  return (
    <>
      <div className="flex items-center gap-3">
        <ReadinessBadge readiness={data} />
        {blocked ? (
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" disabled title={blockedTooltip(data)}>
              Publiceer
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
              Override…
            </Button>
          </div>
        ) : (
          <Button variant="primary" size="sm" onClick={onPublish} disabled={isPublishing}>
            {isPublishing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Publiceren…
              </>
            ) : noScoreYet ? (
              'Publiceer zonder score'
            ) : (
              'Publiceer'
            )}
          </Button>
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

function ReadinessBadge({ readiness }: { readiness: ContentReadiness }) {
  if (readiness.canPublish && readiness.reason === 'ready') {
    const score = Math.round(readiness.latestScore?.compositeScore ?? 0);
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs">
        <CheckCircle2 className="h-3 w-3" />
        Score {score}
      </span>
    );
  }
  if (readiness.canPublish) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs">
        <AlertTriangle className="h-3 w-3" />
        Nog niet gescoord
      </span>
    );
  }
  const score = Math.round(readiness.latestScore?.compositeScore ?? 0);
  const threshold = readiness.latestScore?.threshold ?? 70;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs">
      <ShieldOff className="h-3 w-3" />
      Score {score} / drempel {threshold}
    </span>
  );
}

function blockedTooltip(readiness: ContentReadiness): string {
  if (readiness.latestScore) {
    const score = Math.round(readiness.latestScore.compositeScore);
    const threshold = readiness.latestScore.threshold;
    return `Fidelity-score ${score} ligt onder de drempel ${threshold}. Override mogelijk met reden.`;
  }
  return 'Publish geblokkeerd door QA-poort.';
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
              Override publish-poort
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {score !== undefined && threshold !== undefined ? (
                <>
                  Fidelity-score is <strong>{Math.round(score)}</strong>, onder de drempel{' '}
                  <strong>{threshold}</strong>.
                </>
              ) : (
                'De QA-poort blokkeert publish op deze content.'
              )}
            </p>
          </div>
        </div>

        <label htmlFor="override-reason" className="block text-sm font-medium text-gray-700 mb-1">
          Waarom publiceer je toch? (verplicht, min. 10 tekens)
        </label>
        <textarea
          id="override-reason"
          ref={textareaRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="bv. 'Klant heeft expliciet goedgekeurd — score-tooling is hier te streng'"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          disabled={isPending}
        />
        <p className="text-xs text-gray-500 mt-1">
          Wordt opgeslagen in het audit-trail (LearningEvent + reason-prefix).
        </p>

        {publishedVia && (
          <p className="text-xs text-gray-500 mt-3">
            Distributie via: <code className="text-gray-700">{publishedVia}</code>
          </p>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={isPending}>
            Annuleer
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
                Override…
              </>
            ) : (
              'Bevestig override'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
