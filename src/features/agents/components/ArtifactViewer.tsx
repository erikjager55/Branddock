'use client';

import React, { useState } from 'react';
import {
  Check,
  X,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  FileText,
  Table2,
  ShieldCheck,
  Link2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/shared';
import { MarkdownContent } from '@/features/claw/components/MarkdownContent';
import { ProposalConfirmCard } from './ProposalConfirmCard';
import { useArtifactAction } from '../hooks';
import { navigateToEntity } from '../lib/entity-navigation';
import type { AgentArtifactFull, LinkArtifactContent } from '../types/agents.types';

interface FindingRow {
  severity?: string;
  category?: string;
  location?: string;
  description: string;
  suggestion?: string | null;
}

const SEVERITY_STYLES: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-800 border-red-200',
  MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
  LOW: 'bg-gray-100 text-gray-700 border-gray-200',
};

/**
 * Renderer per artefact-type (bewust één switch, geen framework —
 * Phase -1 Anti-Abstraction). TABLE krijgt zijn echte renderer in
 * agents-data-analyst; hier een bewaar-placeholder.
 */
export function ArtifactViewer({
  artifact,
  onNavigate,
}: {
  artifact: AgentArtifactFull;
  onNavigate: (section: string) => void;
}) {
  const { t } = useTranslation('agents');

  const icon = (() => {
    switch (artifact.type) {
      case 'REPORT':
        return <FileText className="h-4 w-4 text-gray-400" />;
      case 'TABLE':
        return <Table2 className="h-4 w-4 text-gray-400" />;
      case 'FINDINGS':
        return <ShieldCheck className="h-4 w-4 text-gray-400" />;
      case 'LINK':
        return <Link2 className="h-4 w-4 text-gray-400" />;
      case 'PROPOSAL':
        return null; // ProposalConfirmCard has its own header
    }
  })();

  if (artifact.type === 'PROPOSAL') {
    return (
      <div data-testid="artifact-viewer" data-artifact-type="PROPOSAL">
        <ProposalConfirmCard artifact={artifact} />
      </div>
    );
  }

  return (
    <div
      data-testid="artifact-viewer"
      data-artifact-type={artifact.type}
      className="border border-gray-200 rounded-xl bg-white overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        {icon}
        <span className="text-sm font-semibold text-gray-900 truncate">{artifact.title}</span>
        {typeof artifact.fidelityScore === 'number' && (
          <FidelityBadge score={artifact.fidelityScore} />
        )}
      </div>

      <div className="px-4 py-4">
        {artifact.type === 'REPORT' && <ReportBody artifact={artifact} />}
        {artifact.type === 'TABLE' && (
          <p className="text-sm text-muted-foreground">{t('artifact.table.placeholder')}</p>
        )}
        {artifact.type === 'FINDINGS' && <FindingsBody artifact={artifact} />}
        {artifact.type === 'LINK' && <LinkBody artifact={artifact} onNavigate={onNavigate} />}
      </div>

      <ArtifactActions artifact={artifact} onNavigate={onNavigate} />
    </div>
  );
}

// ─── REPORT ──────────────────────────────────────────────────

function ReportBody({ artifact }: { artifact: AgentArtifactFull }) {
  const markdown = typeof artifact.content.markdown === 'string' ? artifact.content.markdown : '';
  return (
    <div data-testid="artifact-report-markdown">
      <MarkdownContent content={markdown} />
    </div>
  );
}

// ─── FINDINGS (F-VAL) ────────────────────────────────────────

function FindingsBody({ artifact }: { artifact: AgentArtifactFull }) {
  const { t } = useTranslation('agents');
  const content = artifact.content;

  const findings: FindingRow[] = Array.isArray(content.findings)
    ? (content.findings as unknown[]).filter(isFindingRow)
    : [];
  // Nooit een stille lage score (ADR D5): expliciete flag óf score onder
  // de drempel → prominente waarschuwing.
  const flagged = content.flagged === true || content.thresholdMet === false;

  return (
    <div className="space-y-3">
      {flagged ? (
        <div
          data-testid="findings-flagged"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-medium"
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {t('artifact.findings.flagged')}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {t('artifact.findings.passed')}
        </div>
      )}

      {findings.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('artifact.findings.noFindings')}</p>
      ) : (
        <ul className="space-y-2">
          {findings.map((finding, index) => (
            <li key={index} className="border border-gray-200 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 mb-1">
                {finding.severity && (
                  <span
                    className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase ${SEVERITY_STYLES[finding.severity] ?? SEVERITY_STYLES.LOW}`}
                  >
                    {finding.severity}
                  </span>
                )}
                {finding.category && (
                  <span className="text-xs text-gray-400 uppercase tracking-wider">
                    {finding.category}
                  </span>
                )}
                {finding.location && (
                  <span className="text-xs text-gray-400 truncate">{finding.location}</span>
                )}
              </div>
              <p className="text-gray-700">{finding.description}</p>
              {finding.suggestion && (
                <p className="text-gray-500 mt-1">
                  <span className="font-medium">{t('artifact.findings.suggestion')}:</span>{' '}
                  {finding.suggestion}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function isFindingRow(value: unknown): value is FindingRow {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).description === 'string'
  );
}

// ─── LINK ────────────────────────────────────────────────────

function LinkBody({
  artifact,
  onNavigate,
}: {
  artifact: AgentArtifactFull;
  onNavigate: (section: string) => void;
}) {
  const { t } = useTranslation('agents');
  const content = artifact.content;
  const link: LinkArtifactContent | null =
    typeof content.entityType === 'string' && typeof content.entityId === 'string'
      ? {
          entityType: content.entityType,
          entityId: content.entityId,
          label: typeof content.label === 'string' ? content.label : undefined,
          campaignId: typeof content.campaignId === 'string' ? content.campaignId : undefined,
        }
      : null;

  const [unavailable, setUnavailable] = useState(false);

  if (!link) {
    return <p className="text-sm text-muted-foreground">{t('artifact.link.unavailable')}</p>;
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-700 truncate">{link.label ?? artifact.title}</span>
      {unavailable ? (
        <span className="text-xs text-muted-foreground">{t('artifact.link.unavailable')}</span>
      ) : (
        <Button
          data-testid="artifact-link-open"
          size="sm"
          variant="secondary"
          icon={ExternalLink}
          onClick={() => {
            const handled = navigateToEntity(link, onNavigate);
            if (!handled) setUnavailable(true);
          }}
        >
          {t('artifact.link.open')}
        </Button>
      )}
    </div>
  );
}

// ─── Fidelity badge ──────────────────────────────────────────

function FidelityBadge({ score }: { score: number }) {
  const { t } = useTranslation('agents');
  const rounded = Math.round(score);
  const color =
    rounded >= 80 ? 'text-emerald-600' : rounded >= 60 ? 'text-amber-600' : 'text-red-600';
  return (
    <span
      data-testid="fidelity-score"
      className="ml-auto inline-flex items-baseline gap-1 text-xs text-gray-400"
      title={t('artifact.fidelityScore')}
    >
      {t('artifact.fidelityScore')}
      <span className={`text-sm font-bold ${color}`}>{rounded}</span>
    </span>
  );
}

// ─── Accept / dismiss footer (REPORT/TABLE/FINDINGS/LINK) ────

function ArtifactActions({
  artifact,
  onNavigate,
}: {
  artifact: AgentArtifactFull;
  onNavigate: (section: string) => void;
}) {
  const { t } = useTranslation('agents');
  const actionMutation = useArtifactAction();
  const knowledgeResourceId =
    typeof artifact.content.knowledgeResourceId === 'string'
      ? artifact.content.knowledgeResourceId
      : null;

  const run = (action: 'accept' | 'dismiss') => {
    actionMutation.mutate(
      { artifactId: artifact.id, action },
      {
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t('artifact.actionError'));
        },
      },
    );
  };

  const isAccepted = !!artifact.acceptedAt;
  const isDismissed = !!artifact.dismissedAt;

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
      {isAccepted ? (
        <span
          data-testid="artifact-accepted"
          className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium"
        >
          <CheckCircle2 className="h-4 w-4" />
          {t('artifact.accepted')}
        </span>
      ) : isDismissed ? (
        <span
          data-testid="artifact-dismissed"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500"
        >
          <X className="h-4 w-4" />
          {t('artifact.dismissed')}
        </span>
      ) : null}

      {isAccepted && knowledgeResourceId && (
        <Button
          data-testid="artifact-open-library"
          size="sm"
          variant="ghost"
          icon={BookOpen}
          onClick={() => onNavigate('knowledge')}
          title={t('artifact.savedToLibrary')}
        >
          {t('artifact.savedToLibrary')}
        </Button>
      )}

      <div className="flex-1" />

      {!isAccepted && (
        <Button
          data-testid="artifact-accept"
          size="sm"
          icon={Check}
          isLoading={actionMutation.isPending}
          onClick={() => run('accept')}
        >
          {t('artifact.accept')}
        </Button>
      )}
      {!isDismissed && (
        <Button
          data-testid="artifact-dismiss"
          size="sm"
          variant="ghost"
          icon={X}
          disabled={actionMutation.isPending}
          onClick={() => run('dismiss')}
        >
          {t('artifact.dismiss')}
        </Button>
      )}
    </div>
  );
}
