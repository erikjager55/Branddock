'use client';

import { PromptEditor } from '../PromptEditor';

// ─── Template Variables per Prompt Type ─────────────────────

const SYSTEM_PROMPT_VARIABLES = [
  { variable: '{{brandContext}}', description: 'Brand assets, personas, products context' },
  { variable: '{{customKnowledge}}', description: 'Knowledge sources from this config' },
  { variable: '{{assetKnowledge}}', description: 'Asset-specific context' },
  { variable: '{{itemName}}', description: 'Name of the item (asset/persona)' },
];

const FEEDBACK_PROMPT_VARIABLES = [
  { variable: '{{dimensionTitle}}', description: 'Title of the current dimension' },
  { variable: '{{questionAsked}}', description: 'The question that was asked' },
  { variable: '{{userAnswer}}', description: 'The user\'s answer' },
  { variable: '{{itemName}}', description: 'Name of the item' },
];

const REPORT_PROMPT_VARIABLES = [
  { variable: '{{allAnswers}}', description: 'All answers (for report)' },
  { variable: '{{itemName}}', description: 'Name of the item' },
  { variable: '{{itemType}}', description: 'Item type (persona/brand_asset)' },
  { variable: '{{itemDescription}}', description: 'Description of the item' },
  { variable: '{{brandContext}}', description: 'Brand assets, personas, products context' },
  { variable: '{{customKnowledge}}', description: 'Knowledge sources from this config' },
  { variable: '{{assetKnowledge}}', description: 'Asset-specific context' },
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
          Configure the AI instructions for each phase of the exploration conversation.
          Click a variable chip to insert it at the cursor position.
        </p>
      </div>

      {/* System Prompt */}
      <PromptEditor
        label="System Prompt"
        description="Defines the AI persona and instructions for the entire exploration conversation"
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
        description="Template for the AI response after each user answer"
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
        description="Template for the final report generated after all dimensions"
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
