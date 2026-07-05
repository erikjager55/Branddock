'use client';

import { useTranslation } from 'react-i18next';
import { PromptEditor } from '../PromptEditor';

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
  const { t } = useTranslation('settings-admin');

  const systemPromptVariables = [
    { variable: '{{brandContext}}', description: t('promptVars.brandContext') },
    { variable: '{{customKnowledge}}', description: t('promptVars.customKnowledge') },
    { variable: '{{assetKnowledge}}', description: t('promptVars.assetKnowledge') },
    { variable: '{{itemName}}', description: t('promptVars.itemNameFull') },
  ];

  const feedbackPromptVariables = [
    { variable: '{{dimensionTitle}}', description: t('promptVars.dimensionTitle') },
    { variable: '{{questionAsked}}', description: t('promptVars.questionAsked') },
    { variable: '{{userAnswer}}', description: t('promptVars.userAnswer') },
    { variable: '{{itemName}}', description: t('promptVars.itemName') },
  ];

  const reportPromptVariables = [
    { variable: '{{allAnswers}}', description: t('promptVars.allAnswers') },
    { variable: '{{itemName}}', description: t('promptVars.itemName') },
    { variable: '{{itemType}}', description: t('promptVars.itemType') },
    { variable: '{{itemDescription}}', description: t('promptVars.itemDescription') },
    { variable: '{{brandContext}}', description: t('promptVars.brandContext') },
    { variable: '{{customKnowledge}}', description: t('promptVars.customKnowledge') },
    { variable: '{{assetKnowledge}}', description: t('promptVars.assetKnowledge') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800">{t('prompts.title')}</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {t('prompts.subtitle')}
        </p>
      </div>

      {/* System Prompt */}
      <PromptEditor
        label={t('prompts.systemLabel')}
        description={t('prompts.systemDescription')}
        value={systemPrompt}
        onChange={onSystemPromptChange}
        variables={systemPromptVariables}
        rows={8}
        placeholder={t('prompts.systemPlaceholder')}
        required
        hasError={errors.systemPrompt}
        onLoadDefault={onLoadDefaultSystem}
      />

      {/* Feedback Prompt */}
      <PromptEditor
        label={t('prompts.feedbackLabel')}
        description={t('prompts.feedbackDescription')}
        value={feedbackPrompt}
        onChange={onFeedbackPromptChange}
        variables={feedbackPromptVariables}
        rows={6}
        placeholder={t('prompts.feedbackPlaceholder')}
        required
        hasError={errors.feedbackPrompt}
        onLoadDefault={onLoadDefaultFeedback}
      />

      {/* Report Prompt */}
      <PromptEditor
        label={t('prompts.reportLabel')}
        description={t('prompts.reportDescription')}
        value={reportPrompt}
        onChange={onReportPromptChange}
        variables={reportPromptVariables}
        rows={10}
        placeholder={t('prompts.reportPlaceholder')}
        required
        hasError={errors.reportPrompt}
        onLoadDefault={onLoadDefaultReport}
      />
    </div>
  );
}
