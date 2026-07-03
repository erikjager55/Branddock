'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import ReactMarkdown from 'react-markdown';
import { AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { Modal, Button } from '@/components/shared';
import { useGenerateBrief, markBriefReady } from '../../../api/brief.api';

export interface BriefRenderViewProps {
  campaignId: string;
  campaignTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal die een gerenderde campagne-brief in markdown toont. Triggers
 * `useGenerateBrief` op open, render via `react-markdown` met
 * design-token-conforme components (geen prose-classes — die ontbreken in
 * src/index.css volgens gotchas 2026-04-19).
 *
 * "Klaar voor klant"-knop logt `campaign_brief_marked_ready` event voor
 * primary-metric tracking (zie task-file acceptatiecriteria).
 */
export function BriefRenderView({
  campaignId,
  campaignTitle,
  isOpen,
  onClose,
}: BriefRenderViewProps) {
  const { t } = useTranslation('campaigns-core');
  const briefQuery = useGenerateBrief(campaignId, { enabled: isOpen });
  const [markedReady, setMarkedReady] = useState(false);
  const [markingError, setMarkingError] = useState<string | null>(null);

  const handleClose = () => {
    setMarkedReady(false);
    setMarkingError(null);
    onClose();
  };

  const handleMarkReady = async () => {
    if (!briefQuery.data) return;
    setMarkingError(null);
    try {
      const flagFieldNames = briefQuery.data.missing.map((m) => m.fieldName);
      // De brief heeft 10 secties; sectie 7/8/9 zijn altijd placeholders. Een
      // sectie geldt als "rendered" als hij geen 'error'-severity missing-flag
      // heeft. Tel UNIEKE secties met error-flags (mapper kan meerdere
      // error-flags per sectie emit'en, bv. `personas` + `masterMessage` —
      // beide section 2/3) — anders deduct'en we dubbel.
      const erroredSections = new Set(
        briefQuery.data.missing
          .filter((m) => m.severity === 'error')
          .map((m) => m.section),
      );
      const sectionsRenderedCount = Math.max(0, 10 - erroredSections.size);
      await markBriefReady(campaignId, {
        sectionsRenderedCount,
        missingDataFlags: flagFieldNames,
      });
      setMarkedReady(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('brief.unknownError');
      setMarkingError(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('brief.title')}
      subtitle={campaignTitle}
      size="xl"
      footer={renderFooter({
        onClose: handleClose,
        onMarkReady: handleMarkReady,
        canMarkReady: !!briefQuery.data && !briefQuery.isLoading,
        markedReady,
        markingError,
        t,
      })}
    >
      <div style={{ maxHeight: '70vh' }} className="overflow-y-auto pr-2">
        {briefQuery.isLoading && <LoadingState />}
        {briefQuery.isError && (
          <ErrorState
            message={briefQuery.error instanceof Error ? briefQuery.error.message : t('brief.unknownError')}
            onRetry={() => briefQuery.refetch()}
          />
        )}
        {briefQuery.data && (
          <BriefContent
            markdown={briefQuery.data.markdown}
            missing={briefQuery.data.missing}
            durationMs={briefQuery.data.durationMs}
            weekThemeError={briefQuery.data.weekThemeError}
            onRegenerate={() => briefQuery.refetch()}
            isRefetching={briefQuery.isFetching}
          />
        )}
      </div>
    </Modal>
  );
}

// ─── States ───────────────────────────────────────────────────

function LoadingState() {
  const { t } = useTranslation('campaigns-core');
  return (
    <div className="flex items-center justify-center py-16 text-gray-500">
      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
      <span>{t('brief.loading')}</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation('campaigns-core');
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
      <p className="text-gray-900 font-medium mb-1">{t('brief.errorTitle')}</p>
      <p className="text-gray-500 mb-4 max-w-md">{message}</p>
      <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
        {t('actions.retry')}
      </Button>
    </div>
  );
}

// ─── Brief content ────────────────────────────────────────────

interface BriefContentProps {
  markdown: string;
  missing: { section: number; fieldName: string; severity: 'warning' | 'error'; message: string }[];
  durationMs: number;
  weekThemeError: string | null;
  onRegenerate: () => void;
  isRefetching: boolean;
}

function BriefContent({ markdown, missing, durationMs, weekThemeError, onRegenerate, isRefetching }: BriefContentProps) {
  const { t } = useTranslation('campaigns-core');
  return (
    <div className="space-y-4">
      {missing.length > 0 && <MissingDataBanner missing={missing} />}
      {weekThemeError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{t('brief.section5Calendar')}</strong> {weekThemeError}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
        <span>{t('brief.renderTime', { seconds: (durationMs / 1000).toFixed(2) })}</span>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isRefetching}
          className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 disabled:opacity-50"
          title={t('brief.regenerateTooltip')}
        >
          <RefreshCw className={`w-3 h-3 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? t('actions.regenerating') : t('actions.regenerate')}
        </button>
      </div>
      <article className="text-gray-800">
        <ReactMarkdown components={MARKDOWN_COMPONENTS}>{markdown}</ReactMarkdown>
      </article>
    </div>
  );
}

function MissingDataBanner({
  missing,
}: {
  missing: { section: number; fieldName: string; severity: 'warning' | 'error'; message: string }[];
}) {
  const { t } = useTranslation('campaigns-core');
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-amber-900 mb-1">
            {t('brief.missingFields', { count: missing.length })}
          </p>
          <ul className="text-amber-800 space-y-0.5">
            {missing.map((m) => (
              <li key={`${m.section}-${m.fieldName}`}>
                {t('brief.missingSectionLabel', { section: m.section })}<code className="text-xs">{m.fieldName}</code>: {m.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Markdown styling (replaces prose-* classes) ──────────────

const MARKDOWN_COMPONENTS = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-3">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2 pb-1 border-b border-gray-200">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-semibold text-gray-900 mt-4 mb-2">{children}</h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-sm font-semibold text-gray-800 mt-3 mb-1">{children}</h4>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc ml-6 mb-3 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal ml-6 mb-3 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-gray-600">{children}</em>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="text-xs bg-gray-100 text-gray-800 px-1 py-0.5 rounded">{children}</code>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2">
      {children}
    </blockquote>
  ),
};

// ─── Footer ───────────────────────────────────────────────────

interface FooterProps {
  onClose: () => void;
  onMarkReady: () => void;
  canMarkReady: boolean;
  markedReady: boolean;
  markingError: string | null;
  t: TFunction;
}

function renderFooter({ onClose, onMarkReady, canMarkReady, markedReady, markingError, t }: FooterProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="text-xs text-amber-700">{markingError}</div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('actions.close')}
        </Button>
        {markedReady ? (
          <Button variant="primary" size="sm" icon={Check} disabled>
            {t('brief.markedReady')}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            icon={Check}
            onClick={onMarkReady}
            disabled={!canMarkReady}
          >
            {t('brief.readyForClient')}
          </Button>
        )}
      </div>
    </div>
  );
}
