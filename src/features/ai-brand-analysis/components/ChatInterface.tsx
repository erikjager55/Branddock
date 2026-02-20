'use client';

import React from 'react';
import type { AIAnalysisMessage, AIAnalysisStatus } from '@/types/ai-analysis';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { OverflowProgressBar } from './OverflowProgressBar';
import { AllAnsweredBanner } from './AllAnsweredBanner';
import { NavigationButtons } from './NavigationButtons';

interface ChatInterfaceProps {
  messages: AIAnalysisMessage[];
  status: AIAnalysisStatus;
  progress: number;
  answeredQuestions: number;
  totalQuestions: number;
  isAITyping: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onComplete: () => void;
  onGenerateReport: () => void;
  isCompleting?: boolean;
  isGenerating?: boolean;
}

export function ChatInterface({
  messages,
  status,
  progress,
  answeredQuestions,
  totalQuestions,
  isAITyping,
  inputValue,
  onInputChange,
  onSubmit,
  onBack,
  onComplete,
  onGenerateReport,
  isCompleting = false,
  isGenerating = false,
}: ChatInterfaceProps) {
  const isAllAnswered = answeredQuestions >= totalQuestions;
  const isInProgress = status === 'IN_PROGRESS';
  const isCompleted = status === 'COMPLETED';

  const navState = isCompleted
    ? 'after_completion'
    : isAllAnswered
      ? 'at_100_percent'
      : 'during_questions';

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-4 pt-4">
        <OverflowProgressBar
          progress={progress}
          answeredQuestions={answeredQuestions}
          totalQuestions={totalQuestions}
        />
      </div>

      {/* Messages */}
      <MessageList messages={messages} isAITyping={isAITyping} />

      {/* All answered banner */}
      {isAllAnswered && isInProgress && <AllAnsweredBanner />}

      {/* Input area (only during active session) */}
      {isInProgress && (
        <InputArea
          value={inputValue}
          onChange={onInputChange}
          onSubmit={onSubmit}
          disabled={isAITyping}
        />
      )}

      {/* Navigation buttons */}
      {(isAllAnswered || isCompleted) && (
        <NavigationButtons
          state={navState}
          onBack={onBack}
          onComplete={onComplete}
          onGenerateReport={onGenerateReport}
          isCompleting={isCompleting}
          isGenerating={isGenerating}
        />
      )}
    </div>
  );
}
