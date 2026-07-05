import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';
import { Modal, Button } from '@/components/shared';
import { useBrandAlignmentStore } from '@/stores/useBrandAlignmentStore';

export function ScanCompleteModal() {
  const { t } = useTranslation('brand-alignment');
  const isOpen = useBrandAlignmentStore((s) => s.isScanCompleteModalOpen);
  const score = useBrandAlignmentStore((s) => s.scanResultScore);
  const issues = useBrandAlignmentStore((s) => s.scanResultIssues);
  const closeScanCompleteModal = useBrandAlignmentStore((s) => s.closeScanCompleteModal);

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeScanCompleteModal}
      title=""
      size="sm"
      showCloseButton={false}
    >
      <div data-testid="scan-complete-modal" className="flex flex-col items-center py-4">
        {/* Success icon */}
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {t('scanComplete.title')}
        </h3>

        <p className="text-sm text-gray-500 mb-6">
          {t('scanComplete.scoreLine', { score: score ?? 0, count: issues ?? 0 })}
        </p>

        <Button variant="primary" onClick={closeScanCompleteModal}>
          {t('scanComplete.viewResults')}
        </Button>
      </div>
    </Modal>
  );
}
