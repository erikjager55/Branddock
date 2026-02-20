'use client';

import React, { useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAIAnalysisStore } from '@/stores/useAIAnalysisStore';
import { useWorkspace } from '@/hooks/use-workspace';
import { PageShell } from '@/components/ui/layout';
import {
  useAIAnalysisSession,
  useStartAnalysis,
  useSendAnswer,
  useCompleteAnalysis,
  useGenerateReport,
  useAIAnalysisReport,
} from '../hooks/useAIAnalysis';
import { AnalysisPageHeader } from './PageHeader';
import { ChatInterface } from './ChatInterface';
import { ReportView } from '../report/ReportView';
import { Skeleton } from '@/components/shared';

interface AIBrandAnalysisPageProps {
  assetId: string;
  assetName?: string;
  onBack: () => void;
}

export function AIBrandAnalysisPage({
  assetId,
  assetName = 'Brand Asset',
  onBack,
}: AIBrandAnalysisPageProps) {
  const { workspaceId } = useWorkspace();
  const store = useAIAnalysisStore();

  // Queries
  const sessionQuery = useAIAnalysisSession(assetId, store.sessionId ?? undefined);
  const reportQuery = useAIAnalysisReport(
    assetId,
    store.sessionId ?? undefined,
    store.isGeneratingReport,
  );

  // Mutations
  const startMutation = useStartAnalysis(assetId);
  const answerMutation = useSendAnswer(assetId, store.sessionId ?? undefined);
  const completeMutation = useCompleteAnalysis(assetId, store.sessionId ?? undefined);
  const reportMutation = useGenerateReport(assetId, store.sessionId ?? undefined);

  // Sync session data to store
  useEffect(() => {
    if (sessionQuery.data) {
      const s = sessionQuery.data;
      store.setStatus(s.status);
      store.setProgress(s.progress, s.answeredQuestions, s.totalQuestions);
      store.setMessages(s.messages);
      store.setLocked(s.locked);
      if (s.reportData) {
        store.setReportData(s.reportData);
      }
    }
  }, [sessionQuery.data]);

  // Watch report polling
  useEffect(() => {
    if (reportQuery.data?.ready && reportQuery.data.reportData) {
      store.setReportData(reportQuery.data.reportData);
      store.setStatus('REPORT_READY');
      store.setGeneratingReport(false);
    }
  }, [reportQuery.data]);

  // Start session if none exists
  const handleStart = useCallback(async () => {
    if (!assetId) return;
    const result = await startMutation.mutateAsync(undefined);
    store.setSessionId(result.sessionId);
    store.setStatus('IN_PROGRESS');
    store.setMessages(result.messages);
  }, [assetId, startMutation, store]);

  // Auto-start on mount if no session
  useEffect(() => {
    if (!store.sessionId && !startMutation.isPending) {
      handleStart();
    }
  }, []);

  // Submit answer
  const handleSubmit = useCallback(async () => {
    const content = store.currentInputValue.trim();
    if (!content || store.isAITyping) return;

    store.setCurrentInput('');
    store.setAITyping(true);

    try {
      const result = await answerMutation.mutateAsync(content);
      // Add user answer to messages
      store.addMessage({
        id: `user-${Date.now()}`,
        type: 'USER_ANSWER',
        content,
        orderIndex: store.messages.length,
        metadata: null,
        createdAt: new Date().toISOString(),
      });
      // Add feedback
      store.addMessage({
        id: `feedback-${Date.now()}`,
        type: 'AI_FEEDBACK',
        content: result.feedback,
        orderIndex: store.messages.length + 1,
        metadata: null,
        createdAt: new Date().toISOString(),
      });
      // Add next question if available
      if (result.nextQuestion) {
        store.addMessage({
          id: `question-${Date.now()}`,
          type: 'AI_QUESTION',
          content: result.nextQuestion,
          orderIndex: store.messages.length + 2,
          metadata: null,
          createdAt: new Date().toISOString(),
        });
      }
      store.setProgress(result.progress, result.answeredQuestions, result.totalQuestions);
    } finally {
      store.setAITyping(false);
    }
  }, [store, answerMutation]);

  // Complete session
  const handleComplete = useCallback(async () => {
    await completeMutation.mutateAsync();
    store.setStatus('COMPLETED');
  }, [completeMutation, store]);

  // Generate report
  const handleGenerateReport = useCallback(async () => {
    store.setGeneratingReport(true);
    store.setStatus('REPORT_GENERATING');
    await reportMutation.mutateAsync();
  }, [reportMutation, store]);

  // Loading state
  if (startMutation.isPending && !store.sessionId) {
    return (
      <PageShell noPadding>
      <div data-testid="skeleton-loader" className="flex flex-col h-full bg-white">
        <AnalysisPageHeader assetName={assetName} status="NOT_STARTED" onBack={onBack} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500">Starting AI analysis session...</p>
          </div>
        </div>
      </div>
      </PageShell>
    );
  }

  // Error state (e.g., start session failed or session query failed)
  if ((startMutation.isError && !store.sessionId) || sessionQuery.isError) {
    const errorMsg = startMutation.error?.message || sessionQuery.error?.message || 'Failed to load AI analysis';
    return (
      <PageShell noPadding>
      <div data-testid="ai-analysis-page" className="flex flex-col h-full bg-white">
        <AnalysisPageHeader assetName={assetName} status="ERROR" onBack={onBack} />
        <div className="flex-1 flex items-center justify-center">
          <div data-testid="error-message" className="text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-semibold text-gray-900">Something went wrong</h3>
            <p className="text-sm text-gray-500 max-w-md">{errorMsg}</p>
          </div>
        </div>
      </div>
      </PageShell>
    );
  }

  // Report view
  const showReport = store.status === 'REPORT_READY' && store.reportData;

  return (
    <PageShell noPadding>
    <div data-testid="ai-analysis-page" className="flex flex-col h-full bg-white">
      <AnalysisPageHeader
        assetName={assetName}
        status={store.status}
        onBack={onBack}
      />

      {showReport ? (
        <ReportView
          reportData={store.reportData!}
          assetName={assetName}
          sessionId={store.sessionId!}
          assetId={assetId}
          isLocked={store.isLocked}
        />
      ) : (
        <ChatInterface
          messages={store.messages}
          status={store.status}
          progress={store.progress}
          answeredQuestions={store.answeredQuestions}
          totalQuestions={store.totalQuestions}
          isAITyping={store.isAITyping}
          inputValue={store.currentInputValue}
          onInputChange={store.setCurrentInput}
          onSubmit={handleSubmit}
          onBack={onBack}
          onComplete={handleComplete}
          onGenerateReport={handleGenerateReport}
          isCompleting={completeMutation.isPending}
          isGenerating={store.isGeneratingReport}
        />
      )}
    </div>
    </PageShell>
  );
}
