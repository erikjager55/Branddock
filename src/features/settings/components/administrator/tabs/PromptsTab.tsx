'use client';

import { PromptEditor } from '../PromptEditor';

// ─── Template Variables per Prompt Type ─────────────────────

const SYSTEM_PROMPT_VARIABLES = [
  { variable: '{{brandContext}}', description: 'Brand assets, personas, products context' },
  { variable: '{{customKnowledge}}', description: 'Kennisbronnen uit deze config' },
  { variable: '{{assetKnowledge}}', description: 'Asset-specifieke context' },
  { variable: '{{itemName}}', description: 'Naam van het item (asset/persona)' },
];

const FEEDBACK_PROMPT_VARIABLES = [
  { variable: '{{dimensionTitle}}', description: 'Titel van de huidige dimensie' },
  { variable: '{{questionAsked}}', description: 'De gestelde vraag' },
  { variable: '{{userAnswer}}', description: 'Het antwoord van de gebruiker' },
  { variable: '{{itemName}}', description: 'Naam van het item' },
];

const REPORT_PROMPT_VARIABLES = [
  { variable: '{{allAnswers}}', description: 'Alle antwoorden (voor rapport)' },
  { variable: '{{itemName}}', description: 'Naam van het item' },
  { variable: '{{itemType}}', description: 'Type item (persona/brand_asset)' },
  { variable: '{{itemDescription}}', description: 'Beschrijving van het item' },
  { variable: '{{brandContext}}', description: 'Brand assets, personas, products context' },
  { variable: '{{customKnowledge}}', description: 'Kennisbronnen uit deze config' },
  { variable: '{{assetKnowledge}}', description: 'Asset-specifieke context' },
];

// ─── Props ──────────────────────────────────────────────────

interface PromptsTabProps {
  systemPrompt: string;
  feedbackPrompt: string;
  reportPrompt: string;
  onSystemPromptChange: (value: string) => void;
  onFeedbackPromptChange: (value: string) => void;
  onReportPromptChange: (value: string) => void;
  onLoadDefaultSystem?: () => void;
  onLoadDefaultFeedback?: () => void;
  onLoadDefaultReport?: () => void;
  errors?: {
    systemPrompt?: boolean;
    feedbackPrompt?: boolean;
    reportPrompt?: boolean;
  };
}

// ─── Component ──────────────────────────────────────────────

export function PromptsTab({
  systemPrompt,
  feedbackPrompt,
  reportPrompt,
  onSystemPromptChange,
  onFeedbackPromptChange,
  onReportPromptChange,
  onLoadDefaultSystem,
  onLoadDefaultFeedback,
  onLoadDefaultReport,
  errors = {},
}: PromptsTabProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800">Prompts</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Configureer de AI instructies voor elke fase van het exploration gesprek.
          Klik op een variabele chip om deze in te voegen op de cursor positie.
        </p>
      </div>

      {/* System Prompt */}
      <PromptEditor
        label="System Prompt"
        description="Definieert de AI persona en instructies voor het gehele exploration gesprek"
        value={systemPrompt}
        onChange={onSystemPromptChange}
        variables={SYSTEM_PROMPT_VARIABLES}
        rows={8}
        placeholder="You are a senior brand strategist..."
        required
        hasError={errors.systemPrompt}
        onLoadDefault={onLoadDefaultSystem}
      />

      {/* Feedback Prompt */}
      <PromptEditor
        label="Feedback Prompt"
        description="Template voor de AI reactie na elk antwoord van de gebruiker"
        value={feedbackPrompt}
        onChange={onFeedbackPromptChange}
        variables={FEEDBACK_PROMPT_VARIABLES}
        rows={6}
        placeholder="Provide brief, constructive feedback..."
        required
        hasError={errors.feedbackPrompt}
        onLoadDefault={onLoadDefaultFeedback}
      />

      {/* Report Prompt */}
      <PromptEditor
        label="Report Prompt"
        description="Template voor het eindrapport dat gegenereerd wordt na alle dimensies"
        value={reportPrompt}
        onChange={onReportPromptChange}
        variables={REPORT_PROMPT_VARIABLES}
        rows={10}
        placeholder="Generate an analysis report..."
        required
        hasError={errors.reportPrompt}
        onLoadDefault={onLoadDefaultReport}
      />
    </div>
  );
}
