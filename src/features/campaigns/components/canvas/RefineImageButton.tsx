'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wand2, Loader2 } from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';

/**
 * Pattern D image-quality-chain: "Improve" knop bij laag-scorende images.
 *
 * Toont alleen wanneer een visual-fidelity score is geladen EN composite-score
 * onder de refine-threshold (65) valt. Server enforced ook de threshold +
 * max-iterations guards (zie /api/studio/.../refine-visual route), dus deze
 * UI-gating is een optimistic display-rule.
 *
 * Op success: refetcht component-data zodat de UI nieuwe imageUrl + nieuwe
 * score binnenhaalt via de bestaande poll/SSE-paden.
 */

const REFINE_TRIGGER_THRESHOLD = 65;

interface RefineImageButtonProps {
  deliverableId: string;
  componentId: string;
  /** Callback na succesvolle refine — caller refetcht component-state. */
  onRefined?: () => void;
}

export function RefineImageButton({
  deliverableId,
  componentId,
  onRefined,
}: RefineImageButtonProps) {
  const { t } = useTranslation('campaigns-canvas');
  const score = useCanvasStore((s) => s.visualFidelityScores.get(componentId));
  const [isRefining, setIsRefining] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Toon knop alleen bij complete score + onder threshold
  if (
    !score ||
    score.stage !== 'complete' ||
    score.compositeScore === null ||
    score.compositeScore === undefined ||
    score.compositeScore >= REFINE_TRIGGER_THRESHOLD
  ) {
    return null;
  }

  async function handleRefine(e: React.MouseEvent) {
    e.stopPropagation();
    if (isRefining) return;
    setError(null);
    setIsRefining(true);
    try {
      const res = await fetch(
        `/api/studio/${deliverableId}/components/${componentId}/refine-visual`,
        { method: 'POST' },
      );
      const body = (await res.json().catch(() => null)) as
        | { error?: string; code?: string }
        | null;
      if (!res.ok) {
        const code = body?.code;
        const message =
          code === 'max-iterations'
            ? t('refineImage.errMaxIterations')
            : code === 'no-score'
              ? t('refineImage.errNoScore')
              : code === 'missing-anchors'
                ? t('refineImage.errMissingAnchors')
                : code === 'policy'
                  ? t('refineImage.errPolicy')
                  : body?.error ?? t('refineImage.errGeneric', { status: res.status });
        setError(message);
        return;
      }
      onRefined?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('refineImage.errUnknown'));
    } finally {
      setIsRefining(false);
    }
  }

  return (
    <div className="absolute bottom-9 left-2 pointer-events-auto">
      <button
        type="button"
        onClick={handleRefine}
        disabled={isRefining}
        title={
          error
            ? t('refineImage.errorTitle', { error })
            : t('refineImage.tooltip')
        }
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/90 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[10px] font-medium shadow-sm transition-colors"
      >
        {isRefining ? (
          <>
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            {t('refineImage.refining')}
          </>
        ) : (
          <>
            <Wand2 className="h-2.5 w-2.5" />
            {t('refineImage.improve')}
          </>
        )}
      </button>
      {error && (
        <p className="mt-1 max-w-[180px] text-[10px] text-red-700 bg-white/95 px-1.5 py-0.5 rounded shadow-sm">
          {error}
        </p>
      )}
    </div>
  );
}
