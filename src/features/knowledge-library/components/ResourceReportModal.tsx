'use client';

import ReactMarkdown from 'react-markdown';
import { AlertTriangle, FileText, RefreshCw } from 'lucide-react';
import { Modal, Button } from '@/components/shared';
import { markdownComponents } from '@/components/shared/markdownComponents';
import { useResourceDetail } from '../hooks';

export interface ResourceReportModalProps {
  /** Resource waarvan het rapport getoond wordt; lege string = nog geen keuze. */
  resourceId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal die het volledige (Deep Research-)rapport van een resource toont.
 * Leest `content` via {@link useResourceDetail} en rendert dat als markdown met
 * de gedeelde {@link markdownComponents}-map. Loading/error/empty-states zijn
 * verplicht: een RESEARCH-resource zonder body (`content === null`) krijgt een
 * eigen empty-state i.p.v. een lege modal.
 */
export function ResourceReportModal({
  resourceId,
  isOpen,
  onClose,
}: ResourceReportModalProps) {
  const detail = useResourceDetail(isOpen ? resourceId : '');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Research report"
      subtitle={detail.data?.title}
      size="xl"
      data-testid="resource-report-modal"
    >
      <div style={{ maxHeight: '70vh' }} className="overflow-y-auto pr-2">
        {detail.isLoading && <ReportLoading />}
        {detail.isError && (
          <ReportError
            message={
              detail.error instanceof Error
                ? detail.error.message
                : 'Unknown error'
            }
            onRetry={() => detail.refetch()}
          />
        )}
        {detail.data && !detail.isLoading && !detail.isError && (
          detail.data.content ? (
            <article className="text-gray-800" data-testid="resource-report-content">
              <ReactMarkdown components={markdownComponents}>
                {detail.data.content}
              </ReactMarkdown>
            </article>
          ) : (
            <ReportEmpty />
          )
        )}
      </div>
    </Modal>
  );
}

function ReportLoading() {
  return (
    <div className="flex items-center justify-center py-16 text-gray-500">
      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
      <span>Loading report…</span>
    </div>
  );
}

function ReportError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
      <p className="text-gray-900 font-medium mb-1">Could not load report</p>
      <p className="text-gray-500 mb-4 max-w-md">{message}</p>
      <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function ReportEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FileText className="w-8 h-8 text-gray-300 mb-3" />
      <p className="text-gray-900 font-medium mb-1">No report content</p>
      <p className="text-gray-500 max-w-md">
        This resource doesn&apos;t have a stored report body.
      </p>
    </div>
  );
}
