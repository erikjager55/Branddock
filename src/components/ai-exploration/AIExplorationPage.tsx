'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Bot, Loader2 } from 'lucide-react';
import type { ExplorationConfig, ExplorationInsightsData, ExplorationMessage } from './types';
import { useAIExplorationStore } from './hooks/useAIExplorationStore';
import { AIExplorationChatInterface } from './AIExplorationChatInterface';
import { AIExplorationReport } from './AIExplorationReport';
import { AIExplorationSuggestions } from './AIExplorationSuggestions';

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
}

export function AIExplorationPage({
  config,
  onStartSession,
  onSendAnswer,
  onComplete,
}: AIExplorationPageProps) {
  const sessionId = useAIExplorationStore((s) => s.sessionId);
  const setSessionId = useAIExplorationStore((s) => s.setSessionId);
  const status = useAIExplorationStore((s) => s.status);
  const setStatus = useAIExplorationStore((s) => s.setStatus);
  const progress = useAIExplorationStore((s) => s.progress);
  const setProgress = useAIExplorationStore((s) => s.setProgress);
  const answeredDimensions = useAIExplorationStore((s) => s.answeredDimensions);
  const setAnsweredDimensions = useAIExplorationStore((s) => s.setAnsweredDimensions);
  const messages = useAIExplorationStore((s) => s.messages);
  const setMessages = useAIExplorationStore((s) => s.setMessages);
  const addMessage = useAIExplorationStore((s) => s.addMessage);
  const isAITyping = useAIExplorationStore((s) => s.isAITyping);
  const setAITyping = useAIExplorationStore((s) => s.setAITyping);
  const currentInput = useAIExplorationStore((s) => s.currentInput);
  const setCurrentInput = useAIExplorationStore((s) => s.setCurrentInput);
  const insightsData = useAIExplorationStore((s) => s.insightsData);
  const setInsightsData = useAIExplorationStore((s) => s.setInsightsData);
  const reset = useAIExplorationStore((s) => s.reset);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ─── Auto-start session ─────────────────────────────────
  useEffect(() => {
    reset();
    setStatus('in_progress');

    onStartSession().then((data) => {
      setSessionId(data.sessionId);
      setMessages(data.messages);
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

    // Add user message to store immediately
    addMessage({
      id: `user-${Date.now()}`,
      type: 'USER_ANSWER',
      content,
      orderIndex: messages.length,
      metadata: null,
      createdAt: new Date().toISOString(),
    });

    setAITyping(true);

    try {
      const result = await onSendAnswer(sessionId, content);
      setProgress(result.progress);
      setAnsweredDimensions(result.answeredDimensions);

      // Add feedback message
      addMessage({
        id: `feedback-${Date.now()}`,
        type: 'AI_FEEDBACK',
        content: result.feedback,
        orderIndex: messages.length + 1,
        metadata: null,
        createdAt: new Date().toISOString(),
      });

      // Add next question if available
      if (result.nextQuestion) {
        addMessage({
          id: `question-${Date.now()}`,
          type: 'AI_QUESTION',
          content: result.nextQuestion.content,
          orderIndex: messages.length + 2,
          metadata: {
            dimensionKey: result.nextQuestion.dimensionKey,
            dimensionTitle: result.nextQuestion.dimensionTitle,
          },
          createdAt: new Date().toISOString(),
        });
      }

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
      <div className="space-y-4 p-6">
        <div className="h-8 rounded animate-pulse" style={{ backgroundColor: '#e5e7eb' }} />
        <div className="h-32 rounded animate-pulse" style={{ backgroundColor: '#e5e7eb' }} />
      </div>
    );
  }

  return (
    <div data-testid="ai-exploration" className="space-y-6 p-6">
      {/* Back link + Header (hidden when COMPLETED) */}
      {status !== 'completed' && (
        <>
          <button
            data-testid="exploration-back-link"
            onClick={config.onBack}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: '#6b7280' }}
          >
            <ArrowLeft className="w-4 h-4" />
            {config.backLabel ?? 'Back'}
          </button>

          <div className="flex items-start gap-4 mb-2">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Bot className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: '#111827' }}>
                {config.pageTitle ?? 'AI Exploration'}
              </h1>
              <p style={{ color: '#6b7280' }}>
                {config.pageDescription ?? 'Beantwoord de vragen om de analyse te starten'}
              </p>
            </div>
          </div>
        </>
      )}

      {/* State: In Progress */}
      {status === 'in_progress' && (
        <div style={{ height: '50vh' }}>
          <AIExplorationChatInterface
            config={config}
            messages={messages}
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
          <p className="text-sm" style={{ color: '#6b7280' }}>Generating report...</p>
        </div>
      )}

      {/* State: Completed — Report or Suggestions */}
      {status === 'completed' && insightsData && !showSuggestions && (
        <AIExplorationReport
          config={config}
          insightsData={insightsData}
          onViewSuggestions={() => setShowSuggestions(true)}
        />
      )}
      {status === 'completed' && insightsData && showSuggestions && (
        <AIExplorationSuggestions
          config={config}
          insightsData={insightsData}
          onBackToReport={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}
