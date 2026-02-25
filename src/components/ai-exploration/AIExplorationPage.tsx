'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Bot, Cpu, Sparkles } from 'lucide-react';
import type { ExplorationConfig, ExplorationInsightsData, ExplorationMessage, ExplorationModelOption } from './types';
import { useAIExplorationStore } from './hooks/useAIExplorationStore';
import { AIExplorationChatInterface } from './AIExplorationChatInterface';
import { AIExplorationReport } from './AIExplorationReport';
import { AIExplorationSuggestions } from './AIExplorationSuggestions';
import { fetchExplorationModels } from '@/lib/api/exploration.api';

interface AIExplorationPageProps {
  config: ExplorationConfig;
  onStartSession: (modelId?: string) => Promise<{
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
  const [models, setModels] = useState<ExplorationModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('claude-sonnet-4-6');
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Fetch available models on mount
  useEffect(() => {
    fetchExplorationModels()
      .then((data) => {
        if (data.length > 0) {
          setModels(data);
          setSelectedModelId(data[0].id);
        }
        setModelsLoaded(true);
      })
      .catch(() => setModelsLoaded(true));
  }, []);

  useEffect(() => {
    reset();
    setStatus('in_progress');
    onStartSession(selectedModelId).then((data) => {
      setSessionId(data.sessionId);
      setMessages(data.messages);
      setProgress(data.progress);
      setAnsweredDimensions(data.answeredDimensions);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.itemId]);

  const handleSubmit = async () => {
    if (!sessionId || !currentInput.trim()) return;
    const content = currentInput.trim();
    setCurrentInput('');

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

      addMessage({
        id: `feedback-${Date.now()}`,
        type: 'AI_FEEDBACK',
        content: result.feedback,
        orderIndex: messages.length + 1,
        metadata: null,
        createdAt: new Date().toISOString(),
      });

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

  // Loading skeleton
  if (!sessionId && status !== 'completed') {
    return (
      <div style={{ padding: '32px' }}>
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-8 rounded-lg animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
          <div className="h-48 rounded-xl animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
          <div className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="ai-exploration" style={{ padding: '32px' }}>
      <div className="max-w-4xl mx-auto">
        {/* ─── Chat View ─── */}
        {status === 'in_progress' && (
          <div className="space-y-6">
            {/* Back link */}
            <button
              onClick={config.onBack}
              className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
              style={{ color: '#6b7280' }}
            >
              <ArrowLeft className="w-4 h-4" />
              {config.backLabel ?? 'Back'}
            </button>

            {/* Header — uniform with other modules */}
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #14b8a6, #10b981)',
                  boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
                }}
              >
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold" style={{ color: '#111827' }}>
                    {config.pageTitle ?? 'AI Exploration'}
                  </h1>
                  {modelsLoaded && models.length > 1 && (
                    <span className="inline-flex items-center gap-1.5 text-xs rounded-full" style={{ padding: '4px 12px', backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                      <Cpu className="h-3 w-3" />
                      {models.find((m) => m.id === selectedModelId)?.name ?? selectedModelId}
                    </span>
                  )}
                </div>
                <p className="text-sm" style={{ color: '#6b7280' }}>
                  {config.pageDescription ?? 'Answer the questions to start the analysis'}
                </p>
              </div>
            </div>

            {/* Chat card — fixed height */}
            <div style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
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
          </div>
        )}

        {/* ─── Completing ─── */}
        {status === 'completing' && (
          <div className="flex flex-col items-center justify-center" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #14b8a6, #10b981)',
                boxShadow: '0 4px 20px rgba(20, 184, 166, 0.3)',
                marginBottom: '16px',
              }}
            >
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
            <p className="text-sm font-medium" style={{ color: '#111827' }}>Generating report...</p>
            <p className="text-xs" style={{ color: '#9ca3af', marginTop: '4px' }}>This takes a few seconds</p>
          </div>
        )}

        {/* ─── Report ─── */}
        {status === 'completed' && insightsData && !showSuggestions && (
          <AIExplorationReport
            config={config}
            insightsData={insightsData}
            onViewSuggestions={() => setShowSuggestions(true)}
          />
        )}

        {/* ─── Suggestions ─── */}
        {status === 'completed' && insightsData && showSuggestions && (
          <AIExplorationSuggestions
            config={config}
            insightsData={insightsData}
            onBackToReport={() => setShowSuggestions(false)}
          />
        )}
      </div>
    </div>
  );
}
