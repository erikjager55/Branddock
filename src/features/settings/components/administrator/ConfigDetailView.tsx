'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Settings,
  MessageCircle,
  FileText,
  BookOpen,
  Eye,
  Copy,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Badge } from '@/components/shared';
import { ExplorationConfigPreviewModal } from './ExplorationConfigPreviewModal';
import { GeneralTab } from './tabs/GeneralTab';
import { DimensionsTab } from './tabs/DimensionsTab';
import { PromptsTab } from './tabs/PromptsTab';
import { KnowledgeTab } from './tabs/KnowledgeTab';
import type {
  ExplorationConfigData,
  StoredDimension,
  StoredFieldSuggestionConfig,
} from '@/lib/ai/exploration/config.types';

// ─── Default prompts (voor "Laad standaard" functionaliteit) ─

const DEFAULT_SYSTEM_PROMPT = `You are a senior brand strategist conducting a structured exploration session.
Guide the user through strategic dimensions with thoughtful questions.
Be warm but professional — like a trusted advisor.
Ask ONE question at a time. Keep questions concise.
Reference specific details from previous answers.

{{brandContext}}

{{customKnowledge}}

{{assetKnowledge}}`;

const DEFAULT_FEEDBACK_PROMPT = `Provide brief, constructive feedback (2-3 sentences) on the user's answer.
Dimension: {{dimensionTitle}}
Question asked: {{questionAsked}}
User's answer: {{userAnswer}}
Acknowledge what's strong. If something could be explored further, note it gently.
Reference their specific words. Never ask a follow-up question.
Respond in the same language as the user.`;

const DEFAULT_REPORT_PROMPT = `Generate an analysis report based on the exploration session.
Item: {{itemName}} ({{itemType}})
{{itemDescription}}

Answers per dimension:
{{allAnswers}}

Brand Context:
{{brandContext}}

{{customKnowledge}}

{{assetKnowledge}}

Generate JSON:
{
  "executiveSummary": "2-3 paragraph strategic summary",
  "findings": [{ "title": "...", "description": "..." }],
  "recommendations": ["..."],
  "fieldSuggestions": [{ "field": "...", "label": "...", "suggestedValue": "...", "reason": "..." }]
}
Respond with valid JSON only.`;

// ─── Default dimensions per item type ────────────────────────

function getDefaultDimensionsForType(itemType: string, itemSubType?: string | null): StoredDimension[] {
  if (itemType === 'persona') {
    return [
      { key: 'demographics', title: 'Demographics Profile', icon: 'Users', question: "Can you tell me more about this persona's background — age range, location, education, professional context?" },
      { key: 'goals_motivations', title: 'Goals & Motivations', icon: 'TrendingUp', question: "What are this persona's primary objectives — both professional and personal?" },
      { key: 'challenges_frustrations', title: 'Challenges & Pain Points', icon: 'Heart', question: "What are the main obstacles this persona faces? What pain points do they experience?" },
      { key: 'value_proposition', title: 'Value Alignment', icon: 'Zap', question: "How does your brand's offering connect with this persona's needs?" },
    ];
  }
  if (itemType === 'brand_asset') {
    if (itemSubType === 'golden-circle') {
      return [
        { key: 'why', title: 'WHY — Core Belief', icon: 'Heart', question: 'Why does your organization exist? What is the fundamental belief that drives everything you do?' },
        { key: 'how', title: 'HOW — Unique Approach', icon: 'Settings', question: 'How do you bring your WHY to life? What processes, values, or methods make your approach unique?' },
        { key: 'what', title: 'WHAT — Offering', icon: 'Package', question: 'What exactly do you offer? How do your products or services prove your WHY and HOW?' },
        { key: 'coherence', title: 'Inside-Out Coherence', icon: 'Target', question: 'How consistently does your organization communicate from WHY → HOW → WHAT? Where are the gaps?' },
      ];
    }
    // Generic brand asset defaults
    return [
      { key: 'core_identity', title: 'Core Identity', icon: 'Fingerprint', question: 'What defines the core identity of this brand asset? What makes it unique?' },
      { key: 'strategic_value', title: 'Strategic Value', icon: 'Target', question: 'How does this asset contribute to your overall brand strategy?' },
      { key: 'audience_relevance', title: 'Audience Relevance', icon: 'Users', question: 'How does this asset resonate with your target audience?' },
      { key: 'consistency', title: 'Brand Consistency', icon: 'Layers', question: 'How well does this asset align with your other brand elements?' },
    ];
  }
  // Product defaults
  return [
    { key: 'value_proposition', title: 'Value Proposition', icon: 'Zap', question: 'What unique value does this product provide to your customers?' },
    { key: 'target_audience', title: 'Target Audience', icon: 'Users', question: 'Who is the ideal customer for this product?' },
    { key: 'differentiation', title: 'Market Differentiation', icon: 'Sparkles', question: 'How does this product stand out from competing solutions?' },
    { key: 'alignment', title: 'Brand Alignment', icon: 'Target', question: 'How well does this product represent your brand values?' },
  ];
}

// ─── Tab Configuration ───────────────────────────────────────

type TabKey = 'general' | 'dimensions' | 'prompts' | 'knowledge';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: typeof Settings;
}

const TABS: TabConfig[] = [
  { key: 'general', label: 'Algemeen', icon: Settings },
  { key: 'dimensions', label: 'Dimensies', icon: MessageCircle },
  { key: 'prompts', label: 'Prompts', icon: FileText },
  { key: 'knowledge', label: 'Kennisbronnen', icon: BookOpen },
];

// ─── Props ──────────────────────────────────────────────────

interface ConfigDetailViewProps {
  initialData?: ExplorationConfigData;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

// ─── Component ──────────────────────────────────────────────

export function ConfigDetailView({
  initialData,
  onSave,
  onCancel,
  onDelete,
  onDuplicate,
}: ConfigDetailViewProps) {
  const isNew = !initialData?.id || initialData.id.startsWith('new-');

  // ─── Tab state ─────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [showPreview, setShowPreview] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // ─── Form state ────────────────────────────────────────
  const [itemType, setItemType] = useState(initialData?.itemType ?? 'persona');
  const [itemSubType, setItemSubType] = useState(initialData?.itemSubType ?? '');
  const [label, setLabel] = useState(initialData?.label ?? '');
  const [provider, setProvider] = useState(initialData?.provider ?? 'anthropic');
  const [model, setModel] = useState(initialData?.model ?? 'claude-sonnet-4-20250514');
  const [temperature, setTemperature] = useState(initialData?.temperature ?? 0.4);
  const [maxTokens, setMaxTokens] = useState(initialData?.maxTokens ?? 2048);
  const [systemPrompt, setSystemPrompt] = useState(initialData?.systemPrompt ?? '');
  const [feedbackPrompt, setFeedbackPrompt] = useState(initialData?.feedbackPrompt ?? '');
  const [reportPrompt, setReportPrompt] = useState(initialData?.reportPrompt ?? '');
  const [dimensions, setDimensions] = useState<StoredDimension[]>(initialData?.dimensions ?? []);
  const [fieldSuggestions, setFieldSuggestions] = useState<StoredFieldSuggestionConfig[]>(
    initialData?.fieldSuggestionsConfig ?? [],
  );
  const [contextSources, setContextSources] = useState<string[]>(initialData?.contextSources ?? []);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Set<number>>(new Set());
  const [promptErrors, setPromptErrors] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ─── Click-outside handler for overflow menu ──────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // ─── Derived state ─────────────────────────────────────
  const displayLabel = label || `${itemType}${itemSubType ? ` → ${itemSubType}` : ''}`;
  const configId = initialData?.id && !initialData.id.startsWith('new-') ? initialData.id : null;

  // ─── Tab error indicators ──────────────────────────────
  const tabErrors = useMemo(() => {
    const errors: Partial<Record<TabKey, boolean>> = {};
    if (dimensions.length === 0 || validationErrors.size > 0) {
      errors.dimensions = true;
    }
    if (promptErrors || !systemPrompt.trim() || !feedbackPrompt.trim() || !reportPrompt.trim()) {
      errors.prompts = true;
    }
    return errors;
  }, [dimensions, validationErrors, promptErrors, systemPrompt, feedbackPrompt, reportPrompt]);

  // ─── Validation ────────────────────────────────────────
  const validate = (): boolean => {
    const errors: string[] = [];
    const invalidDimensions = new Set<number>();

    if (dimensions.length === 0) {
      errors.push('Voeg minimaal 1 dimensie toe');
    } else {
      dimensions.forEach((dim, i) => {
        if (!dim.key?.trim() || !dim.title?.trim() || !dim.question?.trim()) {
          invalidDimensions.add(i);
          errors.push(`Dimensie ${i + 1}: key, titel en vraag zijn verplicht`);
        }
      });
    }

    const hasPromptErrors = !systemPrompt.trim() || !feedbackPrompt.trim() || !reportPrompt.trim();
    if (!systemPrompt.trim()) errors.push('System prompt is verplicht');
    if (!feedbackPrompt.trim()) errors.push('Feedback prompt is verplicht');
    if (!reportPrompt.trim()) errors.push('Report prompt is verplicht');

    setValidationErrors(invalidDimensions);
    setPromptErrors(hasPromptErrors);

    if (errors.length > 0) {
      toast.error(`Validatie mislukt: ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} meer)` : ''}`);
      // Navigate to tab with first error
      if (invalidDimensions.size > 0 || dimensions.length === 0) {
        setActiveTab('dimensions');
      } else if (!systemPrompt.trim() || !feedbackPrompt.trim() || !reportPrompt.trim()) {
        setActiveTab('prompts');
      }
      return false;
    }

    return true;
  };

  // ─── Save handler ──────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      await onSave({
        itemType,
        itemSubType: itemSubType || null,
        label: label || null,
        provider,
        model,
        temperature,
        maxTokens,
        systemPrompt,
        feedbackPrompt,
        reportPrompt,
        dimensions,
        fieldSuggestionsConfig: fieldSuggestions.length > 0 ? fieldSuggestions : null,
        contextSources,
        isActive,
      });
    } catch (err) {
      toast.error(`Opslaan mislukt: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Load defaults handlers ────────────────────────────
  const handleLoadDefaultDimensions = () => {
    if (dimensions.length > 0 && !confirm('Huidige dimensies worden vervangen. Doorgaan?')) return;
    setDimensions(getDefaultDimensionsForType(itemType, itemSubType || null));
    setValidationErrors(new Set());
  };

  const handleLoadDefaultPrompt = (type: 'system' | 'feedback' | 'report') => {
    const current = type === 'system' ? systemPrompt : type === 'feedback' ? feedbackPrompt : reportPrompt;
    if (current.trim() && !confirm('Huidige prompt wordt vervangen. Doorgaan?')) return;
    switch (type) {
      case 'system': setSystemPrompt(DEFAULT_SYSTEM_PROMPT); break;
      case 'feedback': setFeedbackPrompt(DEFAULT_FEEDBACK_PROMPT); break;
      case 'report': setReportPrompt(DEFAULT_REPORT_PROMPT); break;
    }
  };

  // ─── Render ────────────────────────────────────────────

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug naar overzicht
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">{displayLabel}</h2>
              <Badge variant={isActive ? 'success' : 'default'} size="sm">
                {isActive ? 'Actief' : 'Inactief'}
              </Badge>
              {isNew && (
                <Badge variant="info" size="sm">Nieuw</Badge>
              )}
            </div>
            {!isNew && (
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44">
                    {onDuplicate && (
                      <button
                        type="button"
                        onClick={() => { setShowMenu(false); onDuplicate(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Dupliceren
                      </button>
                    )}
                    {onDelete && (
                      <>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          type="button"
                          onClick={() => { setShowMenu(false); onDelete(); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Verwijderen
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="border-b border-gray-200">
          <div className="flex items-center gap-0">
            {TABS.map((tab) => {
              const isTabActive = tab.key === activeTab;
              const hasError = tabErrors[tab.key];
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    isTabActive
                      ? 'text-teal-600 border-b-2 border-teal-500'
                      : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                  {hasError && (
                    <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'general' && (
            <GeneralTab
              itemType={itemType}
              itemSubType={itemSubType}
              label={label}
              provider={provider}
              model={model}
              temperature={temperature}
              maxTokens={maxTokens}
              contextSources={contextSources}
              isActive={isActive}
              isNew={isNew}
              onItemTypeChange={setItemType}
              onItemSubTypeChange={setItemSubType}
              onLabelChange={setLabel}
              onProviderChange={setProvider}
              onModelChange={setModel}
              onTemperatureChange={setTemperature}
              onMaxTokensChange={setMaxTokens}
              onContextSourcesChange={setContextSources}
              onIsActiveChange={setIsActive}
            />
          )}
          {activeTab === 'dimensions' && (
            <DimensionsTab
              dimensions={dimensions}
              validationErrors={validationErrors}
              onChange={(dims, editedIndex) => {
                setDimensions(dims);
                if (editedIndex !== undefined) {
                  // Single field edit — clear only that dimension's error
                  if (validationErrors.has(editedIndex)) {
                    const next = new Set(validationErrors);
                    next.delete(editedIndex);
                    setValidationErrors(next);
                  }
                } else {
                  // Structural change (add/remove/move) — clear all since indices shifted
                  if (validationErrors.size > 0) setValidationErrors(new Set());
                }
              }}
              onLoadDefaults={handleLoadDefaultDimensions}
            />
          )}
          {activeTab === 'prompts' && (
            <PromptsTab
              systemPrompt={systemPrompt}
              feedbackPrompt={feedbackPrompt}
              reportPrompt={reportPrompt}
              onSystemPromptChange={(v) => { setSystemPrompt(v); setPromptErrors(false); }}
              onFeedbackPromptChange={(v) => { setFeedbackPrompt(v); setPromptErrors(false); }}
              onReportPromptChange={(v) => { setReportPrompt(v); setPromptErrors(false); }}
              onLoadDefaultSystem={() => handleLoadDefaultPrompt('system')}
              onLoadDefaultFeedback={() => handleLoadDefaultPrompt('feedback')}
              onLoadDefaultReport={() => handleLoadDefaultPrompt('report')}
              errors={{
                systemPrompt: !systemPrompt.trim() && promptErrors,
                feedbackPrompt: !feedbackPrompt.trim() && promptErrors,
                reportPrompt: !reportPrompt.trim() && promptErrors,
              }}
            />
          )}
          {activeTab === 'knowledge' && (
            <KnowledgeTab configId={configId} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between py-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {dimensions.length} dimensies geconfigureerd
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              icon={Eye}
              onClick={() => setShowPreview(true)}
            >
              Preview
            </Button>
            <Button variant="secondary" size="md" onClick={onCancel}>
              Annuleren
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              isLoading={isSaving}
            >
              Opslaan
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <ExplorationConfigPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        configLabel={displayLabel}
        itemType={itemType || ''}
        itemSubType={itemSubType || null}
        dimensions={dimensions.map((d) => ({
          key: d.key,
          title: d.title,
          question: d.question,
          followUpHint: d.followUpHint,
          icon: d.icon,
        }))}
        provider={provider}
        model={model}
      />
    </>
  );
}
