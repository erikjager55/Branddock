'use client';

import { Radar, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Modal, Button, ProgressBar } from '@/components/shared';
import { useScanProgress, useCancelScan } from '../../hooks';
import { useTrendRadarStore } from '../../stores/useTrendRadarStore';

export function ScanProgressModal() {
  const { isScanProgressModalOpen, closeScanProgressModal, scanJobId } = useTrendRadarStore();
  const { data: progress } = useScanProgress(isScanProgressModalOpen ? scanJobId : null);
  const cancelMutation = useCancelScan();

  const isRunning = progress?.status === 'RUNNING' || progress?.status === 'PENDING';
  const isComplete = progress?.status === 'COMPLETED';
  const isFailed = progress?.status === 'FAILED';
  const isCancelled = progress?.status === 'CANCELLED';

  const pct = progress && progress.sourcesTotal > 0
    ? Math.round((progress.sourcesCompleted / progress.sourcesTotal) * 100)
    : 0;

  const handleCancel = async () => {
    if (scanJobId) {
      await cancelMutation.mutateAsync(scanJobId);
    }
  };

  return (
    <Modal
      isOpen={isScanProgressModalOpen}
      onClose={closeScanProgressModal}
      title="Scanning Trend Sources"
      size="md"
    >
      <div className="space-y-6 py-2">
        {/* Icon */}
        <div className="flex justify-center">
          {isRunning && (
            <div className="relative">
              <Radar className="w-12 h-12 text-teal-600 animate-pulse" />
            </div>
          )}
          {isComplete && <CheckCircle2 className="w-12 h-12 text-emerald-500" />}
          {isFailed && <AlertCircle className="w-12 h-12 text-red-500" />}
          {isCancelled && <X className="w-12 h-12 text-gray-400" />}
        </div>

        {/* Status text */}
        <div className="text-center">
          {isRunning && (
            <>
              <p className="text-sm font-medium text-gray-900">
                Scanning sources for new trends...
              </p>
              {progress?.currentSourceName && (
                <p className="text-xs text-gray-500 mt-1">
                  Currently scanning: {progress.currentSourceName}
                </p>
              )}
            </>
          )}
          {isComplete && (
            <p className="text-sm font-medium text-emerald-700">
              Scan complete! Found {progress?.trendsDetected ?? 0} new trend{(progress?.trendsDetected ?? 0) !== 1 ? 's' : ''}.
            </p>
          )}
          {isFailed && (
            <p className="text-sm font-medium text-red-700">
              Scan failed. Please try again.
            </p>
          )}
          {isCancelled && (
            <p className="text-sm font-medium text-gray-600">
              Scan cancelled.
            </p>
          )}
        </div>

        {/* Progress bar */}
        {progress && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">
                {progress.sourcesCompleted}/{progress.sourcesTotal} sources
              </span>
              <span className="text-xs font-medium text-gray-600">{pct}%</span>
            </div>
            <ProgressBar
              value={pct}
              color={isComplete ? 'emerald' : isFailed ? 'red' : 'teal'}
              size="md"
            />
          </div>
        )}

        {/* Stats */}
        {progress && (
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="text-center">
              <span className="block text-lg font-bold text-gray-900">{progress.trendsDetected}</span>
              <span className="text-xs text-gray-500">Trends found</span>
            </div>
            <div className="text-center">
              <span className="block text-lg font-bold text-gray-900">{progress.sourcesCompleted}</span>
              <span className="text-xs text-gray-500">Sources scanned</span>
            </div>
            {progress.errors.length > 0 && (
              <div className="text-center">
                <span className="block text-lg font-bold text-red-600">{progress.errors.length}</span>
                <span className="text-xs text-gray-500">Errors</span>
              </div>
            )}
          </div>
        )}

        {/* Errors */}
        {progress && progress.errors.length > 0 && (
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs font-medium text-red-700 mb-1">Errors:</p>
            <ul className="space-y-0.5">
              {progress.errors.map((err, i) => (
                <li key={i} className="text-xs text-red-600">{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-2">
          {isRunning && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancel}
              isLoading={cancelMutation.isPending}
            >
              Cancel Scan
            </Button>
          )}
          {!isRunning && (
            <Button variant="primary" size="sm" onClick={closeScanProgressModal}>
              Close
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
