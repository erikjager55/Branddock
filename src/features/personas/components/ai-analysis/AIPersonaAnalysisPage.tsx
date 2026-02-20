'use client';

import { useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { SkeletonCard } from '@/components/shared';
import { PageShell } from '@/components/ui/layout';
import {
  usePersonaDetail,
  useStartAnalysisSession,
  useAnalysisSession,
  useSendAnalysisAnswer,
  useCompleteAnalysis,
} from '../../hooks';
import { useAIPersonaAnalysisStore } from '../../stores/useAIPersonaAnalysisStore';
import { PersonaAnalysisChatInterface } from './PersonaAnalysisChatInterface';
import { PersonaAnalysisProgressBar } from './PersonaAnalysisProgressBar';
import { PersonaAnalysisComplete } from './PersonaAnalysisComplete';

interface AIPersonaAnalysisPageProps {
  personaId: string;
  onBack: () => void;
}

export function AIPersonaAnalysisPage({ personaId, onBack }: AIPersonaAnalysisPageProps) {
  const { data: persona } = usePersonaDetail(personaId);

  const sessionId = useAIPersonaAnalysisStore((s) => s.sessionId);
  const setSessionId = useAIPersonaAnalysisStore((s) => s.setSessionId);
  const status = useAIPersonaAnalysisStore((s) => s.status);
  const setStatus = useAIPersonaAnalysisStore((s) => s.setStatus);
  const progress = useAIPersonaAnalysisStore((s) => s.progress);
  const setProgress = useAIPersonaAnalysisStore((s) => s.setProgress);
  const answeredDimensions = useAIPersonaAnalysisStore((s) => s.answeredDimensions);
  const setAnsweredDimensions = useAIPersonaAnalysisStore((s) => s.setAnsweredDimensions);
  const isAITyping = useAIPersonaAnalysisStore((s) => s.isAITyping);
  const setAITyping = useAIPersonaAnalysisStore((s) => s.setAITyping);
  const currentInput = useAIPersonaAnalysisStore((s) => s.currentInput);
  const setCurrentInput = useAIPersonaAnalysisStore((s) => s.setCurrentInput);
  const insightsData = useAIPersonaAnalysisStore((s) => s.insightsData);
  const setInsightsData = useAIPersonaAnalysisStore((s) => s.setInsightsData);

  const reset = useAIPersonaAnalysisStore((s) => s.reset);

  const startSession = useStartAnalysisSession(personaId);
  const { data: sessionData } = useAnalysisSession(personaId, sessionId);
  const sendAnswer = useSendAnalysisAnswer(personaId, sessionId);
  const completeAnalysis = useCompleteAnalysis(personaId, sessionId);

  // Reset store on mount / personaId change and auto-start session
  useEffect(() => {
    reset();
    startSession.mutateAsync().then((data) => {
      setSessionId(data.sessionId);
      setStatus('IN_PROGRESS');
    });
  }, [personaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync session data
  useEffect(() => {
    if (sessionData) {
      setProgress(sessionData.progress);
      setAnsweredDimensions(sessionData.answeredDimensions);
      if (sessionData.status === 'COMPLETED' && sessionData.insightsData) {
        setStatus('COMPLETED');
        setInsightsData(sessionData.insightsData);
      }
    }
  }, [sessionData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    const content = currentInput.trim();
    if (!content || !sessionId) return;

    setAITyping(true);
    setCurrentInput('');

    try {
      const result = await sendAnswer.mutateAsync(content);

      setProgress(result.progress);
      if (result.progress >= 100) {
        // Auto-complete
        setStatus('completing');
        const completeResult = await completeAnalysis.mutateAsync();
        setInsightsData(completeResult.insightsData);
        setStatus('COMPLETED');
      }
    } finally {
      setAITyping(false);
    }
  };

  if (!persona) {
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
    <div data-testid="persona-ai-analysis" className="space-y-6">
      {/* Breadcrumb */}
      <button
        data-testid="analysis-back-link"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {persona.name}
      </button>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">AI Persona Analysis</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {persona.name} {persona.tagline && `— ${persona.tagline}`}
        </p>
      </div>

      {/* State: In Progress */}
      {status !== 'COMPLETED' && status !== 'completing' && (
        <>
          <PersonaAnalysisProgressBar
            progress={progress}
            answeredDimensions={answeredDimensions}
          />
          <div className="h-[50vh]">
            <PersonaAnalysisChatInterface
              messages={sessionData?.messages ?? []}
              isAITyping={isAITyping}
              currentInput={currentInput}
              onInputChange={setCurrentInput}
              onSubmit={handleSubmit}
              isSubmitting={sendAnswer.isPending}
            />
          </div>
        </>
      )}

      {/* State: Completing */}
      {status === 'completing' && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
          <p className="text-sm text-gray-500">Completing analysis...</p>
        </div>
      )}

      {/* State: Completed */}
      {status === 'COMPLETED' && insightsData && (
        <PersonaAnalysisComplete
          insightsData={insightsData}
          personaName={persona.name}
          onBack={onBack}
        />
      )}
    </div>
    </PageShell>
  );
}
