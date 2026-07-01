import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Modal, ProgressBar } from '@/components/shared';
import { useScanProgress } from '@/contexts/BrandAlignmentContext';
import { useBrandAlignmentStore } from '@/stores/useBrandAlignmentStore';
import type { ScanStatus } from '@/types/brand-alignment';

// ─── Step descriptions ──────────────────────────────────────

const SCAN_STEP_KEYS = [
  'scanSteps.foundation',
  'scanSteps.strategy',
  'scanSteps.brandstyle',
  'scanSteps.personas',
  'scanSteps.products',
  'scanSteps.market',
  'scanSteps.report',
] as const;

function getStepIndex(progress: number): number {
  return Math.min(Math.floor((progress / 100) * SCAN_STEP_KEYS.length), SCAN_STEP_KEYS.length - 1);
}

function statusIcon(status: ScanStatus | undefined) {
  if (status === 'COMPLETED') return <CheckCircle className="w-5 h-5 text-emerald-500" />;
  if (status === 'FAILED') return <XCircle className="w-5 h-5 text-red-500" />;
  return <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />;
}

// ─── Component ──────────────────────────────────────────────

export function ScanProgressModal() {
  const { t } = useTranslation('brand-alignment');

  function modalTitle(status: ScanStatus | undefined): string {
    if (status === 'COMPLETED') return t('scanProgress.completeTitle');
    if (status === 'FAILED') return t('scanProgress.failedTitle');
    return t('scanProgress.runningTitle');
  }

  function modalSubtitle(status: ScanStatus | undefined): string {
    if (status === 'COMPLETED') return t('scanProgress.completeSubtitle');
    if (status === 'FAILED') return t('scanProgress.failedSubtitle');
    return t('scanProgress.runningSubtitle');
  }

  const activeScanId = useBrandAlignmentStore((s) => s.activeScanId);
  const isScanning = useBrandAlignmentStore((s) => s.isScanning);
  const setIsScanning = useBrandAlignmentStore((s) => s.setIsScanning);
  const setActiveScanId = useBrandAlignmentStore((s) => s.setActiveScanId);

  const { data: scanData } = useScanProgress(activeScanId ?? null);

  const progress = scanData?.progress ?? 0;
  const status = scanData?.status;
  const stepIndex = getStepIndex(progress);
  const isDone = status === 'COMPLETED' || status === 'FAILED';

  // Auto-close after completion
  useEffect(() => {
    if (!isDone) return;
    const timer = setTimeout(() => {
      setIsScanning(false);
      setActiveScanId(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isDone, setIsScanning, setActiveScanId]);

  const handleClose = () => {
    if (isDone) {
      setIsScanning(false);
      setActiveScanId(null);
    }
  };

  return (
    <Modal
      isOpen={isScanning}
      onClose={handleClose}
      title={modalTitle(status)}
      subtitle={modalSubtitle(status)}
      size="sm"
      showCloseButton={isDone}
    >
      <div className="space-y-4 py-2">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">{t('scanProgress.progress')}</span>
            <span className="text-xs font-medium text-gray-700">{progress}%</span>
          </div>
          <ProgressBar
            value={progress}
            color={status === 'FAILED' ? 'red' : 'teal'}
            size="md"
          />
        </div>

        {/* Current step */}
        {!isDone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
            {t(SCAN_STEP_KEYS[stepIndex])}
          </div>
        )}

        {/* Module steps checklist */}
        <div className="space-y-1.5">
          {SCAN_STEP_KEYS.map((stepKey, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs ${
                i < stepIndex
                  ? 'text-emerald-600'
                  : i === stepIndex && !isDone
                  ? 'text-gray-700 font-medium'
                  : isDone && status === 'COMPLETED'
                  ? 'text-emerald-600'
                  : 'text-gray-300'
              }`}
            >
              {i < stepIndex || (isDone && status === 'COMPLETED') ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              ) : i === stepIndex && !isDone ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-gray-200 flex-shrink-0" />
              )}
              {t(stepKey)}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
