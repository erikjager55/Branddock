'use client';

import React, { useState } from 'react';
import { Play, Loader2, CheckCircle2, XCircle, BellRing, Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared';
import { useStartAgentRun } from '../hooks';
import type { CatalogAgentUseCase, StartAgentRunResponse } from '../types/agents.types';

/**
 * Input-formulier voor een geselecteerde use-case: opdracht-tekst →
 * POST /api/agents/run (synchroon — kan minuten duren) → inline
 * resultaat-samenvatting met inbox-link. Een FAILED run is een normaal
 * 200-resultaat en wordt inline + in de inbox getoond.
 */
export function UseCaseForm({
  agentId,
  useCase,
  onViewInInbox,
}: {
  agentId: string;
  useCase: CatalogAgentUseCase;
  onViewInInbox: (runId: string) => void;
}) {
  const { t } = useTranslation('agents');
  const startRun = useStartAgentRun();
  const [message, setMessage] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<StartAgentRunResponse | null>(null);

  const handleRun = () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setValidationError(t('detail.form.inputRequired'));
      return;
    }
    setValidationError(null);
    setLastResult(null);
    startRun.mutate(
      { agentId, useCaseId: useCase.id, input: { message: trimmed } },
      {
        onSuccess: (result) => {
          setLastResult(result);
          setMessage('');
        },
      },
    );
  };

  return (
    <div data-testid="use-case-form" className="space-y-3">
      <div>
        <label
          htmlFor={`use-case-input-${useCase.id}`}
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {t('detail.form.inputLabel')}
        </label>
        <textarea
          id={`use-case-input-${useCase.id}`}
          data-testid="use-case-input"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t('detail.form.inputPlaceholder')}
          rows={3}
          disabled={startRun.isPending}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 disabled:bg-gray-50 disabled:text-gray-400 resize-y"
        />
      </div>

      {validationError && (
        <p data-testid="use-case-validation-error" className="text-sm text-red-600">
          {validationError}
        </p>
      )}

      {startRun.isPending ? (
        <div
          data-testid="run-in-progress"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700"
        >
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          {t('detail.form.running')}
        </div>
      ) : (
        <Button data-testid="use-case-run" icon={Play} onClick={handleRun}>
          {t('detail.form.run')}
        </Button>
      )}

      {startRun.isError && (
        <div
          data-testid="run-start-error"
          className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
        >
          <span className="min-w-0 break-words">
            {t('detail.form.startError')}: {startRun.error.message}
          </span>
          <Button size="sm" variant="secondary" onClick={handleRun}>
            {t('catalog.error.retry')}
          </Button>
        </div>
      )}

      {lastResult && <RunResultCard result={lastResult} onViewInInbox={onViewInInbox} />}
    </div>
  );
}

function RunResultCard({
  result,
  onViewInInbox,
}: {
  result: StartAgentRunResponse;
  onViewInInbox: (runId: string) => void;
}) {
  const { t } = useTranslation('agents');

  const presentation = (() => {
    switch (result.status) {
      case 'COMPLETED':
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />,
          title: t('detail.result.completedTitle'),
          style: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        };
      case 'AWAITING_CONFIRMATION':
        return {
          icon: <BellRing className="h-4 w-4 text-amber-600 flex-shrink-0" />,
          title: t('detail.result.awaitingTitle'),
          style: 'bg-amber-50 border-amber-200 text-amber-800',
        };
      case 'FAILED':
        return {
          icon: <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />,
          title: t('detail.result.failedTitle'),
          style: 'bg-red-50 border-red-200 text-red-800',
        };
    }
  })();

  return (
    <div
      data-testid="run-result"
      data-run-status={result.status}
      className={`rounded-lg border px-3 py-2.5 text-sm space-y-1.5 ${presentation.style}`}
    >
      <div className="flex items-center gap-2">
        {presentation.icon}
        <span className="font-medium">{presentation.title}</span>
        {result.artifactIds.length > 0 && (
          <span className="text-xs opacity-70">
            {t('detail.result.artifacts', { count: result.artifactIds.length })}
          </span>
        )}
        <Button
          data-testid="run-result-inbox"
          size="sm"
          variant="secondary"
          icon={Inbox}
          className="ml-auto"
          onClick={() => onViewInInbox(result.runId)}
        >
          {t('detail.result.viewInInbox')}
        </Button>
      </div>
      {result.error && <p className="text-xs opacity-80 break-words">{result.error}</p>}
    </div>
  );
}
