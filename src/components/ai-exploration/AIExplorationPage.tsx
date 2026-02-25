'use client';

import { useEffect } from 'react';
import { ArrowLeft, Bot, Loader2 } from 'lucide-react';
import { SkeletonCard } from '@/components/shared';
import { PageShell } from '@/components/ui/layout';
import type { ExplorationConfig, ExplorationInsightsData, ExplorationMessage } from './types';
import { useAIExplorationStore } from './hooks/useAIExplorationStore';
import { AIExplorationChatInterface } from './AIExplorationChatInterface';
import { AIExplorationReport } from './AIExplorationReport';

interface AIExplorationPageProps {
  config: ExplorationConfig;
  /**
   * Hook callbacks — the parent (thin wrapper) provides these
   * so the generic page doesn't need to know about specific API routes.
   */
  onStartSession: () => Promise<{
    sessionId: string;
    messages: ExplorationMessage[];
    progress: number;
    answeredDimensions: number;
  }>;
  onSendAnswer: (
    sessionId: string,
    content: string,
  ) => Promise<{
    feedback: string;
    nextQuestion: { content: string; dimensionKey: string; dimensionTitle: string } | null;
    progress: number;
    answeredDimensions: number;
    isComplete: boolean;
  }>;
  onComplete: (sessionId: string) => Promise<{
    insightsData: ExplorationInsightsData;
  }>;
  /** Optional: current session data if resuming */
  sessionData?: {
    messages: ExplorationMessage[];
  } | null;
}

export function AIExplorationPage({
  config,
  onStartSession,
  onSendAnswer,
  onComplete,
  sessionData,
}: AIExplorationPageProps) {
  const sessionId = useAIExplorationStore((s) => s.sessionId);
  const setSessionId = useAIExplorationStore((s) => s.setSessionId);
  const status = useAIExplorationStore((s) => s.status);
  const setStatus = useAIExplorationStore((s) => s.setStatus);
  const progress = useAIExplorationStore((s) => s.progress);
  const setProgress = useAIExplorationStore((s) => s.setProgress);
  const answeredDimensions = useAIExplorationStore((s) => s.answeredDimensions);
  const setAnsweredDimensions = useAIExplorationStore((s) => s.setAnsweredDimensions);
  const isAITyping = useAIExplorationStore((s) => s.isAITyping);
  const setAITyping = useAIExplorationStore((s) => s.setAITyping);
  const currentInput = useAIExplorationStore((s) => s.currentInput);
  const setCurrentInput = useAIExplorationStore((s) => s.setCurrentInput);
  const insightsData = useAIExplorationStore((s) => s.insightsData);
  const setInsightsData = useAIExplorationStore((s) => s.setInsightsData);
  const reset = useAIExplorationStore((s) => s.reset);

  // ─── Auto-start session ─────────────────────────────────
  useEffect(() => {
    reset();
    setStatus('in_progress');

    onStartSession().then((data) => {
      setSessionId(data.sessionId);
      setProgress(data.progress);
      setAnsweredDimensions(data.answeredDimensions);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.itemId]);

  // ─── Submit answer ──────────────────────────────────────
  const handleSubmit = async () => {
    if (!sessionId || !currentInput.trim()) return;

    const content = currentInput.trim();
    setCurrentInput('');
    setAITyping(true);

    try {
      const result = await onSendAnswer(sessionId, content);
      setProgress(result.progress);
      setAnsweredDimensions(result.answeredDimensions);

      if (result.isComplete) {
        setStatus('completing');
        const completeResult = await onComplete(sessionId);
        setInsightsData(completeResult.insightsData);
        setStatus('completed');
      }
    } finally {
      setAITyping(false);
    }
  };

  // ─── Loading state ──────────────────────────────────────
  if (!sessionId && status !== 'completed') {
    return (
      <PageShell>
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div data-testid="ai-exploration" className="space-y-6">
        {/* Back link + Header (hidden when COMPLETED) */}
        {status !== 'completed' && (
          <>
            <button
              data-testid="exploration-back-link"
              onClick={config.onBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {config.backLabel ?? 'Back'}
            </button>

            <div className="flex items-start gap-4 mb-2">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Bot className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  {config.pageTitle ?? 'AI Exploration'}
                </h1>
                <p className="text-muted-foreground">
                  {config.pageDescription ?? 'Beantwoord de vragen om de analyse te starten'}
                </p>
              </div>
            </div>
          </>
        )}

        {/* State: In Progress */}
        {status === 'in_progress' && (
          <div className="h-[50vh]">
            <AIExplorationChatInterface
              config={config}
              messages={sessionData?.messages ?? []}
              isAITyping={isAITyping}
              currentInput={currentInput}
              onInputChange={setCurrentInput}
              onSubmit={handleSubmit}
              isSubmitting={false}
              progress={progress}
              answeredDimensions={answeredDimensions}
            />
          </div>
        )}

        {/* State: Completing */}
        {status === 'completing' && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Generating report...</p>
          </div>
        )}

        {/* State: Completed */}
        {status === 'completed' && insightsData && (
          <AIExplorationReport config={config} insightsData={insightsData} />
        )}
      </div>
    </PageShell>
  );
}
