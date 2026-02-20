import React from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { Modal, Button } from '@/components/shared';
import {
  useFixOptions,
  useApplyFix,
  useDismissIssue,
  useAlignmentIssueDetail,
} from '@/contexts/BrandAlignmentContext';
import { useBrandAlignmentStore } from '@/stores/useBrandAlignmentStore';
import { useUIState } from '@/contexts/UIStateContext';
import { getEntitySection } from '@/lib/alignment/navigation';
import { IssueSummaryBox } from './IssueSummaryBox';
import { CurrentContentCompare } from './CurrentContentCompare';
import { FixOptionsGroup } from './FixOptionsGroup';

export function FixIssueModal() {
  const isOpen = useBrandAlignmentStore((s) => s.isFixModalOpen);
  const selectedIssueId = useBrandAlignmentStore((s) => s.selectedIssueId);
  const selectedFixOption = useBrandAlignmentStore((s) => s.selectedFixOption);
  const selectFixOption = useBrandAlignmentStore((s) => s.selectFixOption);
  const closeFixModal = useBrandAlignmentStore((s) => s.closeFixModal);

  const { setActiveSection } = useUIState();

  const { data: fixData, isLoading: isLoadingOptions } = useFixOptions(
    isOpen ? selectedIssueId : null
  );
  const { data: issueDetail } = useAlignmentIssueDetail(
    isOpen ? (selectedIssueId ?? undefined) : undefined
  );
  const applyFix = useApplyFix();
  const dismissIssue = useDismissIssue();

  const sourceSection = getEntitySection(issueDetail?.sourceItemType ?? null);

  function handleApplyFix() {
    if (!selectedIssueId || !selectedFixOption) return;
    applyFix.mutate(
      { id: selectedIssueId, body: { optionKey: selectedFixOption } },
      { onSuccess: () => closeFixModal() }
    );
  }

  function handleDismiss() {
    if (!selectedIssueId) return;
    dismissIssue.mutate(
      { id: selectedIssueId },
      { onSuccess: () => closeFixModal() }
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeFixModal}
      title="Fix Alignment Issue"
      size="lg"
    >
      {isLoadingOptions ? (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading fix options...</span>
        </div>
      ) : fixData ? (
        <div data-testid="fix-issue-modal" className="space-y-5 py-2">
          {/* Issue summary */}
          <IssueSummaryBox description={fixData.issueSummary} />

          {/* Current content comparison */}
          <CurrentContentCompare
            source={fixData.currentContent.source}
            target={fixData.currentContent.target}
          />

          {/* Fix options */}
          <FixOptionsGroup
            options={fixData.options}
            selectedKey={selectedFixOption}
            onSelect={selectFixOption}
          />

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDismiss}
                disabled={dismissIssue.isPending}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Dismiss
              </button>
              {sourceSection && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ExternalLink}
                  onClick={() => {
                    closeFixModal();
                    setActiveSection(sourceSection);
                  }}
                >
                  Edit Manually
                </Button>
              )}
            </div>
            <Button
              variant="primary"
              onClick={handleApplyFix}
              disabled={!selectedFixOption || applyFix.isPending}
              isLoading={applyFix.isPending}
            >
              Apply Fix
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-12 text-sm text-gray-400">
          Failed to load fix options
        </div>
      )}
    </Modal>
  );
}
