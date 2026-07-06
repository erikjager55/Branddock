'use client';

import React, { useState } from 'react';
import { Check, X, Wrench, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/shared';
import { useConfirmProposal } from '../hooks';
import type { AgentArtifactFull } from '../types/agents.types';

interface ProposalChange {
  field: string;
  label: string;
  currentValue: string | null;
  proposedValue: string;
}

/**
 * PROPOSAL-artefact confirm-weergave (patroon MutationConfirmCard, maar
 * post-run: de run staat op AWAITING_CONFIRMATION en bevestiging loopt
 * via POST /api/agents/runs/[runId]/confirm — contract-afspraak
 * 2026-07-06: {artifactId, approved} → {executed, result?, runStatus}.
 * PATCH-accept op een PROPOSAL is expliciet géén pad (geeft 400).
 */
export function ProposalConfirmCard({ artifact }: { artifact: AgentArtifactFull }) {
  const { t } = useTranslation('agents');
  const confirmMutation = useConfirmProposal();
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<'approved' | 'rejected' | null>(null);

  const content = artifact.content;
  const description = typeof content.description === 'string' ? content.description : artifact.title;
  const entityName = typeof content.entityName === 'string' ? content.entityName : null;
  const changes: ProposalChange[] = Array.isArray(content.changes)
    ? (content.changes as unknown[]).filter(isProposalChange)
    : [];

  const handleConfirm = (approved: boolean) => {
    setError(null);
    confirmMutation.mutate(
      { runId: artifact.runId, artifactId: artifact.id, approved },
      {
        onSuccess: () => {
          setResolved(approved ? 'approved' : 'rejected');
          toast.success(approved ? t('artifact.proposal.approved') : t('artifact.proposal.rejected'));
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : t('artifact.proposal.confirmError'));
        },
      },
    );
  };

  if (resolved) {
    return (
      <div
        data-testid="proposal-resolved"
        className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${
          resolved === 'approved'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-gray-50 border-gray-200 text-gray-600'
        }`}
      >
        {resolved === 'approved' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        {resolved === 'approved' ? t('artifact.proposal.approved') : t('artifact.proposal.rejected')}
      </div>
    );
  }

  return (
    <div
      data-testid="proposal-confirm-card"
      className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Wrench className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-semibold text-gray-900">{t('artifact.proposal.title')}</span>
        {entityName && (
          <span className="px-2 py-0.5 rounded-md bg-white border border-amber-200 text-xs text-gray-600">
            {entityName}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-700">{description}</p>

      {changes.length > 0 && (
        <div className="space-y-2">
          {changes.map((change) => (
            <div key={change.field} className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1.5">{change.label}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-gray-50 border border-gray-100 p-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
                    {t('artifact.proposal.current')}
                  </p>
                  <p className="text-gray-600 whitespace-pre-wrap break-words">
                    {change.currentValue ?? t('artifact.proposal.emptyValue')}
                  </p>
                </div>
                <div className="rounded-md bg-emerald-50 border border-emerald-100 p-2">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-500 mb-0.5">
                    {t('artifact.proposal.proposed')}
                  </p>
                  <p className="text-gray-800 whitespace-pre-wrap break-words">{change.proposedValue}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          data-testid="proposal-error"
          className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          data-testid="proposal-approve"
          size="sm"
          icon={Check}
          isLoading={confirmMutation.isPending}
          onClick={() => handleConfirm(true)}
        >
          {t('artifact.proposal.approve')}
        </Button>
        <Button
          data-testid="proposal-reject"
          size="sm"
          variant="ghost"
          icon={X}
          disabled={confirmMutation.isPending}
          onClick={() => handleConfirm(false)}
        >
          {t('artifact.proposal.reject')}
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {t('artifact.proposal.approveNote')}
        </span>
      </div>
    </div>
  );
}

function isProposalChange(value: unknown): value is ProposalChange {
  if (typeof value !== 'object' || value === null) return false;
  const change = value as Record<string, unknown>;
  return (
    typeof change.field === 'string' &&
    typeof change.label === 'string' &&
    typeof change.proposedValue === 'string' &&
    (change.currentValue === null || typeof change.currentValue === 'string')
  );
}
