import React, { useEffect } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Modal, ProgressBar } from '@/components/shared';
import { useScanProgress } from '@/contexts/BrandAlignmentContext';
import { useBrandAlignmentStore } from '@/stores/useBrandAlignmentStore';
import type { ScanStatus } from '@/types/brand-alignment';

// ─── Step descriptions ──────────────────────────────────────

const SCAN_STEPS = [
  'Analysing Brand Foundation...',
  'Checking Business Strategy alignment...',
  'Verifying Brandstyle consistency...',
  'Scanning Personas data...',
  'Reviewing Products & Services...',
  'Cross-referencing Market Insights...',
  'Generating alignment report...',
];

function getStepIndex(progress: number): number {
  return Math.min(Math.floor((progress / 100) * SCAN_STEPS.length), SCAN_STEPS.length - 1);
}

function statusIcon(status: ScanStatus | undefined) {
  if (status === 'COMPLETED') return <CheckCircle className="w-5 h-5 text-emerald-500" />;
  if (status === 'FAILED') return <XCircle className="w-5 h-5 text-red-500" />;
  return <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />;
}

function modalTitle(status: ScanStatus | undefined): string {
  if (status === 'COMPLETED') return 'Scan Complete';
  if (status === 'FAILED') return 'Scan Failed';
  return 'Running Alignment Scan';
}

function modalSubtitle(status: ScanStatus | undefined): string {
  if (status === 'COMPLETED') return 'Your brand alignment report is ready.';
  if (status === 'FAILED') return 'Something went wrong. Please try again.';
  return 'Checking consistency across all brand modules...';
}

// ─── Component ──────────────────────────────────────────────

export function ScanProgressModal() {
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
            <span className="text-xs text-gray-500">Progress</span>
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
            {SCAN_STEPS[stepIndex]}
          </div>
        )}

        {/* Module steps checklist */}
        <div className="space-y-1.5">
          {SCAN_STEPS.map((step, i) => (
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
              {step}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
