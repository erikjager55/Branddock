'use client';

import React, { useState } from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useUpdateApproval, usePublishDeliverable } from '../../hooks/canvas.hooks';
import type { ApprovalStatus } from '../../types/canvas.types';
// Note: useCanvasStore.getState() used in handlePublish to preserve existing metadata
import { Badge, Button } from '@/components/shared';
import {
  Send,
  CheckCircle2,
  MessageSquare,
  Globe,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface ApprovalActionBarProps {
  deliverableId: string;
  onDeriveClick: () => void;
}

const STATUS_CONFIG: Record<ApprovalStatus, {
  label: string;
  variant: 'default' | 'info' | 'success' | 'warning' | 'danger';
}> = {
  DRAFT: { label: 'Draft', variant: 'default' },
  IN_REVIEW: { label: 'In Review', variant: 'info' },
  APPROVED: { label: 'Approved', variant: 'success' },
  CHANGES_REQUESTED: { label: 'Changes Requested', variant: 'warning' },
  PUBLISHED: { label: 'Published', variant: 'success' },
};

/** Approval action bar shown in Canvas header — status badge + context-appropriate actions */
export function ApprovalActionBar({ deliverableId, onDeriveClick }: ApprovalActionBarProps) {
  const approvalStatus = useCanvasStore((s) => s.approvalStatus);
  const setApprovalState = useCanvasStore((s) => s.setApprovalState);

  const updateApproval = useUpdateApproval(deliverableId);
  const publishMutation = usePublishDeliverable(deliverableId);

  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');

  const config = STATUS_CONFIG[approvalStatus];
  const isLoading = updateApproval.isPending || publishMutation.isPending;

  const handleTransition = async (newStatus: ApprovalStatus, transitionNote?: string) => {
    try {
      const result = await updateApproval.mutateAsync({ status: newStatus, note: transitionNote });
      setApprovalState({
        approvalStatus: result.approvalStatus as ApprovalStatus,
        approvalNote: result.approvalNote,
        approvedBy: result.approvedBy,
        approvedAt: result.approvedAt,
      });
      setShowNoteInput(false);
      setNote('');
    } catch {
      // Error displayed via mutation state
    }
  };

  const handlePublish = async () => {
    try {
      const result = await publishMutation.mutateAsync(undefined);
      setApprovalState({
        approvalStatus: 'PUBLISHED',
        approvalNote: useCanvasStore.getState().approvalNote,
        approvedBy: useCanvasStore.getState().approvedBy,
        approvedAt: useCanvasStore.getState().approvedAt,
        publishedAt: result.publishedAt,
      });
    } catch {
      // Error displayed via mutation state
    }
  };

  const handleRequestChanges = () => {
    if (!showNoteInput) {
      setShowNoteInput(true);
      return;
    }
    if (!note.trim()) return;
    handleTransition('CHANGES_REQUESTED', note);
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={config.variant}>{config.label}</Badge>

      {/* DRAFT → Submit for Review */}
      {approvalStatus === 'DRAFT' && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleTransition('IN_REVIEW')}
          disabled={isLoading}
        >
          <Send className="h-3.5 w-3.5 mr-1" />
          Submit for Review
        </Button>
      )}

      {/* IN_REVIEW → Approve or Request Changes */}
      {approvalStatus === 'IN_REVIEW' && (
        <>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleTransition('APPROVED')}
            disabled={isLoading}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Approve
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRequestChanges}
            disabled={isLoading}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            Request Changes
          </Button>
        </>
      )}

      {/* CHANGES_REQUESTED → Resubmit */}
      {approvalStatus === 'CHANGES_REQUESTED' && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleTransition('IN_REVIEW')}
          disabled={isLoading}
        >
          <Send className="h-3.5 w-3.5 mr-1" />
          Resubmit for Review
        </Button>
      )}

      {/* APPROVED → Publish or Derive */}
      {approvalStatus === 'APPROVED' && (
        <>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePublish}
            disabled={isLoading}
          >
            <Globe className="h-3.5 w-3.5 mr-1" />
            Publish
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onDeriveClick}
            disabled={isLoading}
          >
            <Clock className="h-3.5 w-3.5 mr-1" />
            Derive for Platform
          </Button>
        </>
      )}

      {/* PUBLISHED → Derive only */}
      {approvalStatus === 'PUBLISHED' && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onDeriveClick}
          disabled={isLoading}
        >
          <Clock className="h-3.5 w-3.5 mr-1" />
          Derive for Platform
        </Button>
      )}

      {/* Note input for Request Changes */}
      {showNoteInput && approvalStatus === 'IN_REVIEW' && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && note.trim()) handleRequestChanges();
              if (e.key === 'Escape') { setShowNoteInput(false); setNote(''); }
            }}
            placeholder="Describe what needs to change..."
            className="text-sm border border-gray-300 rounded-md px-2 py-1 w-64 focus:outline-none focus:ring-1 focus:ring-primary-500"
            autoFocus
          />
          <button
            type="button"
            onClick={() => { setShowNoteInput(false); setNote(''); }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Error display */}
      {(updateApproval.isError || publishMutation.isError) && (
        <span className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {(updateApproval.error ?? publishMutation.error)?.message ?? 'Action failed'}
        </span>
      )}
    </div>
  );
}
