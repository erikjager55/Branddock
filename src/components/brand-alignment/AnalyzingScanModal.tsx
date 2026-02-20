import React, { useEffect } from 'react';
import { Shield } from 'lucide-react';
import { Modal, Button } from '@/components/shared';
import { useScanProgress, useCancelScan } from '@/contexts/BrandAlignmentContext';
import { useBrandAlignmentStore } from '@/stores/useBrandAlignmentStore';
import { ScanStepChecklist } from './ScanStepChecklist';

export function AnalyzingScanModal() {
  const activeScanId = useBrandAlignmentStore((s) => s.activeScanId);
  const isScanning = useBrandAlignmentStore((s) => s.isScanning);
  const setIsScanning = useBrandAlignmentStore((s) => s.setIsScanning);
  const setActiveScanId = useBrandAlignmentStore((s) => s.setActiveScanId);
  const openScanCompleteModal = useBrandAlignmentStore((s) => s.openScanCompleteModal);

  const { data: scanData } = useScanProgress(activeScanId);
  const cancelScan = useCancelScan();

  const progress = scanData?.progress ?? 0;
  const currentStep = scanData?.currentStep ?? 0;
  const completedSteps = scanData?.completedSteps ?? [];
  const status = scanData?.status;
  const isDone = status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';
  const isFailed = status === 'FAILED';

  // Transition to complete modal when scan finishes
  useEffect(() => {
    if (status === 'COMPLETED' && scanData) {
      const timer = setTimeout(() => {
        setIsScanning(false);
        setActiveScanId(null);
        openScanCompleteModal(scanData.score ?? 0, scanData.issuesFound ?? 0);
      }, 800);
      return () => clearTimeout(timer);
    }
    if (status === 'FAILED' || status === 'CANCELLED') {
      const timer = setTimeout(() => {
        setIsScanning(false);
        setActiveScanId(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, scanData, setIsScanning, setActiveScanId, openScanCompleteModal]);

  function handleCancel() {
    if (activeScanId) {
      cancelScan.mutate(activeScanId);
    }
  }

  return (
    <Modal
      isOpen={isScanning}
      onClose={() => {}}
      title=""
      size="sm"
      showCloseButton={false}
    >
      <div data-testid="scan-progress-modal" className="flex flex-col items-center pt-2 pb-4">
        {/* Shield icon */}
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-green-600" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Analyzing Brand Alignment
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          Checking consistency across all modules
        </p>

        {/* Progress bar */}
        <div className="w-full mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs font-medium text-gray-700">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step checklist */}
        <div className="w-full mb-5">
          <ScanStepChecklist
            currentStep={currentStep}
            completedSteps={completedSteps}
            isDone={isDone}
            isFailed={isFailed}
          />
        </div>

        {/* Footer info */}
        <p className="text-xs text-gray-400 text-center mb-4">
          Analyzing 18 knowledge items across 6 modules.
          This may take up to 30 seconds.
        </p>

        {/* Cancel button */}
        {!isDone && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={cancelScan.isPending}
            isLoading={cancelScan.isPending}
          >
            Cancel
          </Button>
        )}
      </div>
    </Modal>
  );
}
