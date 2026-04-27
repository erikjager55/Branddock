'use client';

import React from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { useCanvasOrchestration } from '../../../hooks/useCanvasOrchestration';
import { Building2, Lightbulb, Route, Monitor, BookOpen, Plus, X, Sparkles, Search, Trash2, FileText } from 'lucide-react';
import { Badge, Skeleton, SkeletonText } from '@/components/shared';
import { WEBSITE_DELIVERABLE_TYPES } from '@/lib/ai/seo-pipeline.types';
import { STUDIO } from '@/lib/constants/design-tokens';
import type { BrandContextBlock } from '@/lib/ai/prompt-templates';
import { ContentTypeInputFields } from '../../shared/ContentTypeInputFields';
import { getContentTypeInputs, getRequiredInputs, type ContentTypeInputValue } from '../../../lib/content-type-inputs';

interface Step1ContextProps {
  deliverableId: string;
  onAdvance?: () => void;
}

export function Step1Context({ deliverableId, onAdvance }: Step1ContextProps) {
  const contextStack = useCanvasStore((s) => s.contextStack);
  const additionalContextItems = useCanvasStore((s) => s.additionalContextItems);
  const removeContextItem = useCanvasStore((s) => s.removeContextItem);
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const contentType = useCanvasStore((s) => s.contentType);
  const contentTypeInputs = useCanvasStore((s) => s.contentTypeInputs);
  const { generate, isGenerating } = useCanvasOrchestration(deliverableId);

  // When content has already been generated (variants exist in the store,
  // loaded either from a wizard session or from persisted DeliverableComponent
  // records), the CTA should take the user forward to review the variants,
  // not re-run the expensive generation pipeline. The user can still trigger
  // a fresh generation via the secondary "Regenerate" link.
  const hasExistingContent = variantGroups.size > 0;

  // Required-field gate: advancing past Step 1 (and triggering generation)
  // should not be possible while required content-type inputs are empty.
  const missingRequired = React.useMemo(() => {
    if (!contentType) return [] as { key: string; label: string }[];
    const required = getRequiredInputs(contentType);
    return required.filter((field) => {
      const value = contentTypeInputs[field.key];
      if (value == null) return true;
      if (typeof value === 'string') return value.trim().length === 0;
      if (Array.isArray(value)) return value.length === 0;
      return false;
    }).map((f) => ({ key: f.key, label: f.label }));
  }, [contentType, contentTypeInputs]);

  const hasMissingRequired = missingRequired.length > 0;

  const handleContinue = () => {
    onAdvance?.();
  };

  const handleGenerate = async () => {
    try {
      // Trigger content generation (SSE auto-advance handles step 2 transition)
      await generate();

      // Read fresh state after async generation (avoid stale closures)
      const state = useCanvasStore.getState();
      const brand = state.contextStack?.brand;
      const medium = state.contextStack?.medium;
      const phase = state.contextStack?.journeyPhase;
      const knowledgeCount = state.additionalContextItems.size;

      const summaryParts: string[] = [];
      if (brand?.brandName) summaryParts.push(`Brand: ${brand.brandName}`);
      if (medium?.platform && medium?.format) summaryParts.push(`${medium.platform}/${medium.format}`);
      if (phase?.phase) summaryParts.push(`${phase.phase} phase`);
      if (knowledgeCount > 0) summaryParts.push(`${knowledgeCount} knowledge items`);

      state.setStepSummary('context', {
        label: summaryParts.join(' | ') || 'Context reviewed',
      });
    } catch (err) {
      console.error('[Step1Context] Generation failed:', err);
    }
  };

  if (!contextStack) {
    return (
      <div className="space-y-3">
        <SkeletonContextCard />
        <SkeletonContextCard />
        <SkeletonContextCard />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Context cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Brand */}
        <ContextCard icon={<Building2 className="h-4 w-4" />} title="Brand">
          <BrandContent brand={contextStack.brand} />
        </ContextCard>

        {/* Campaign Concept */}
        <ContextCard icon={<Lightbulb className="h-4 w-4" />} title="Campaign Concept">
          {contextStack.concept ? (
            <>
              {contextStack.concept.campaignTheme && (
                <p className="text-sm text-gray-600">{contextStack.concept.campaignTheme}</p>
              )}
              {contextStack.concept.positioningStatement && (
                <p className="text-xs text-gray-500 mt-1">{contextStack.concept.positioningStatement}</p>
              )}
              {contextStack.concept.keyMessages?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {contextStack.concept.keyMessages.map((msg, i) => (
                    <Badge key={i} variant="default" size="sm">{msg}</Badge>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 italic">No concept data available</p>
          )}
        </ContextCard>

        {/* Journey Phase */}
        <ContextCard icon={<Route className="h-4 w-4" />} title="Journey Phase">
          {contextStack.journeyPhase ? (
            <>
              <Badge variant="info" size="sm">{contextStack.journeyPhase.phase}</Badge>
              {contextStack.journeyPhase.phaseObjectives?.length > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  {contextStack.journeyPhase.phaseObjectives.join(', ')}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 italic">No phase data available</p>
          )}
        </ContextCard>

        {/* Medium */}
        <ContextCard icon={<Monitor className="h-4 w-4" />} title="Medium">
          {contextStack.medium ? (
            <>
              <div className="flex gap-2">
                <Badge variant="teal" size="sm">{contextStack.medium.platform}</Badge>
                <Badge variant="default" size="sm">{contextStack.medium.format}</Badge>
              </div>
              {contextStack.medium.bestPractices?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {contextStack.medium.bestPractices.slice(0, 2).map((bp, i) => (
                    <li key={i} className="text-xs text-gray-500">• {bp}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 italic">No medium data available</p>
          )}
        </ContextCard>
      </div>

      {/* Briefing — settings.brief (set by Claw create_deliverable or wizard) */}
      <BriefSection />

      {/* Content Brief — type-specific input fields. Required fields gate the
          Generate button; optional fields tweak the AI output. Lives here (not
          in a side panel) because the Generate CTA sits a few rows down. */}
      <ContentBriefSection />

      {/* Knowledge context */}
      {additionalContextItems.size > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Knowledge Context</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(additionalContextItems.entries()).map(([key, item]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-md"
              >
                <span className="truncate">{item.title}</span>
                <button
                  type="button"
                  onClick={() => removeContextItem(key)}
                  aria-label={`Remove ${item.title}`}
                  className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add knowledge context button */}
      <button
        type="button"
        onClick={() => useCanvasStore.getState().toggleContextSelector()}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary-700 font-medium"
      >
        <Plus className="h-3 w-3" />
        {additionalContextItems.size > 0 ? 'Add more context' : 'Select knowledge context'}
      </button>

      {/* SEO Research inputs (website types only) */}
      {WEBSITE_DELIVERABLE_TYPES.has(contextStack.deliverableTypeId ?? '') && (
        <SeoInputCard />
      )}

      {/* Primary CTA — Continue (if content exists) or Generate (first time) */}
      <div className="pt-2 space-y-2">
        {/* Missing-required alert — blocks Continue / Generate until filled.
            The Content Brief section just above this CTA contains the fields. */}
        {hasMissingRequired && (
          <div
            role="alert"
            className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800"
          >
            <span className="text-amber-600 mt-0.5">*</span>
            <div className="flex-1">
              <p className="font-semibold">
                Fill in required field{missingRequired.length > 1 ? 's' : ''} above to continue:
              </p>
              <ul className="mt-0.5 list-disc list-inside">
                {missingRequired.map((f) => (
                  <li key={f.key}>{f.label}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {hasExistingContent ? (
          <>
            <button
              type="button"
              onClick={handleContinue}
              disabled={hasMissingRequired}
              aria-disabled={hasMissingRequired}
              title={hasMissingRequired ? 'Fill in required fields first' : undefined}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Sparkles className="h-4 w-4" />
              Continue to Variants
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || hasMissingRequired}
              aria-busy={isGenerating}
              title={hasMissingRequired ? 'Fill in required fields first' : undefined}
              className="w-full text-xs text-gray-500 hover:text-gray-700 underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
            >
              {isGenerating ? 'Regenerating...' : 'Regenerate from scratch'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || hasMissingRequired}
            aria-busy={isGenerating}
            title={hasMissingRequired ? 'Fill in required fields first' : undefined}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Generate Content'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────

function ContextCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-gray-500">{icon}</span>
        <span className="text-sm font-medium text-gray-700">{title}</span>
      </div>
      <div className="break-words" style={{ minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}

function firstSentence(text: string | undefined): string | null {
  if (!text) return null;
  const match = text.match(/^(.+?[.!?])(?:\s|$)/);
  const result = match ? match[1] : text;
  return result.length > 120 ? result.slice(0, 117) + '...' : result;
}

function BrandContent({ brand }: { brand: BrandContextBlock }) {
  const filledFields = [
    brand.brandPurpose, brand.goldenCircle, brand.brandEssence,
    brand.brandPromise, brand.brandMission, brand.brandVision,
    brand.brandArchetype, brand.brandPersonality, brand.brandStory,
    brand.transformativeGoals, brand.socialRelevancy,
  ].filter(Boolean).length;

  const purposeSummary = firstSentence(brand.brandPurpose);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">{brand.brandName}</p>
        <Badge variant="default" size="sm">{filledFields}/11</Badge>
      </div>
      {purposeSummary && (
        <p className="text-xs text-gray-500 line-clamp-2">{purposeSummary}</p>
      )}
      {brand.targetAudience && (
        <p className="text-xs text-gray-500">Audience: {brand.targetAudience}</p>
      )}
    </div>
  );
}

/**
 * Briefing section — surfaces `settings.brief` (objective / keyMessage /
 * tone / CTA). Filled by Claw via `create_deliverable` or by the wizard's
 * launch step. Edits autosave through CanvasPage (debounced PATCH).
 *
 * Sits ABOVE the content-type input fields because brief is the strategic
 * "what & why" — type-specific inputs (SEO keyword, meta description, etc.)
 * are tactical knobs that build on top of the brief.
 */
function BriefSection() {
  const brief = useCanvasStore((s) => s.brief);
  const setBriefField = useCanvasStore((s) => s.setBriefField);

  const filledCount = Object.values(brief).filter(
    (v) => typeof v === 'string' && v.trim().length > 0,
  ).length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-gray-700">Briefing</span>
        </div>
        {filledCount > 0 && (
          <Badge variant="default" size="sm">
            {filledCount}/4
          </Badge>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-3">
        The strategic frame — what this content needs to do. Inherited from
        the campaign briefing or set when you (or Claw) create the item.
      </p>
      <div className="space-y-2.5">
        <BriefField
          label="Objective"
          placeholder="What this content should achieve"
          value={brief.objective}
          onChange={(v) => setBriefField('objective', v)}
        />
        <BriefField
          label="Key message"
          placeholder="The single thing the audience should take away"
          value={brief.keyMessage}
          onChange={(v) => setBriefField('keyMessage', v)}
        />
        <BriefField
          label="Tone direction"
          placeholder="e.g. authoritative, playful, urgent"
          value={brief.toneDirection}
          onChange={(v) => setBriefField('toneDirection', v)}
        />
        <BriefField
          label="Call to action"
          placeholder="What should the audience do next?"
          value={brief.callToAction}
          onChange={(v) => setBriefField('callToAction', v)}
        />
      </div>
    </div>
  );
}

function BriefField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-gray-600 mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-400 resize-y"
      />
    </label>
  );
}


function SeoInputCard() {
  const seoInput = useCanvasStore((s) => s.seoInput);
  const setSeoInput = useCanvasStore((s) => s.setSeoInput);

  const addCompetitorUrl = () => {
    if (seoInput.competitorUrls.length >= 5) return;
    setSeoInput({ competitorUrls: [...seoInput.competitorUrls, ''] });
  };

  const updateCompetitorUrl = (index: number, value: string) => {
    const updated = [...seoInput.competitorUrls];
    updated[index] = value;
    setSeoInput({ competitorUrls: updated });
  };

  const removeCompetitorUrl = (index: number) => {
    setSeoInput({ competitorUrls: seoInput.competitorUrls.filter((_, i) => i !== index) });
  };

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-teal-600" />
        <span className="text-sm font-medium text-teal-800">SEO Research</span>
        <span className="text-xs text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded">8-step pipeline</span>
      </div>
      <p className="text-xs text-teal-700">
        Add a primary keyword to activate the SEO research pipeline. This runs keyword research, competitor analysis, E-E-A-T mapping, and editorial review before generating content.
      </p>

      {/* Primary keyword */}
      <div>
        <label htmlFor="seo-keyword" className="block text-xs font-medium text-gray-700 mb-1">
          Primary Keyword
        </label>
        <input
          id="seo-keyword"
          type="text"
          value={seoInput.primaryKeyword}
          onChange={(e) => setSeoInput({ primaryKeyword: e.target.value })}
          placeholder="e.g. brand strategy software"
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
        />
      </div>

      {/* Funnel stage */}
      <div>
        <label htmlFor="seo-funnel" className="block text-xs font-medium text-gray-700 mb-1">
          Funnel Stage
        </label>
        <select
          id="seo-funnel"
          value={seoInput.funnelStage}
          onChange={(e) => setSeoInput({ funnelStage: e.target.value as 'awareness' | 'consideration' | 'decision' })}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-white"
        >
          <option value="awareness">Awareness — Educational, problem-aware</option>
          <option value="consideration">Consideration — Comparing solutions</option>
          <option value="decision">Decision — Ready to buy/sign up</option>
        </select>
      </div>

      {/* Competitor URLs (optional) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-700">
            Competitor URLs <span className="text-gray-400 font-normal">(optional, max 5)</span>
          </label>
          {seoInput.competitorUrls.length < 5 && (
            <button
              type="button"
              onClick={addCompetitorUrl}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-0.5"
            >
              <Plus className="h-3 w-3" /> Add URL
            </button>
          )}
        </div>
        {seoInput.competitorUrls.length === 0 && (
          <p className="text-xs text-gray-400 italic">
            Leave empty for automatic competitor discovery via Google Search
          </p>
        )}
        {seoInput.competitorUrls.map((url, i) => (
          <div key={i} className="flex gap-1.5 mb-1.5">
            <input
              type="url"
              value={url}
              onChange={(e) => updateCompetitorUrl(i, e.target.value)}
              placeholder="https://competitor.com/their-page"
              aria-label={`Competitor URL ${i + 1}`}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={() => removeCompetitorUrl(i)}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded"
              aria-label={`Remove competitor URL ${i + 1}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonContextCard() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="mt-2">
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

/**
 * Type-specific input fields for the active deliverable. Required fields are
 * highlighted with an amber accent because they gate the Generate CTA below;
 * optional fields tweak the AI output but never block. Lives in Step 1 (no
 * longer in a side panel) so the user sees + fills everything in one column.
 */
function ContentBriefSection() {
  const contentType = useCanvasStore((s) => s.contentType);
  const contentTypeInputs = useCanvasStore((s) => s.contentTypeInputs);
  const setContentTypeInput = useCanvasStore((s) => s.setContentTypeInput);

  const fields = React.useMemo(
    () => (contentType ? getContentTypeInputs(contentType) : []),
    [contentType],
  );

  const requiredFields = React.useMemo(
    () => fields.filter((f) => f.required),
    [fields],
  );
  const optionalFields = React.useMemo(
    () => fields.filter((f) => !f.required),
    [fields],
  );

  const handleChange = React.useCallback(
    (key: string, value: ContentTypeInputValue) => {
      setContentTypeInput(key, value);
    },
    [setContentTypeInput],
  );

  if (fields.length === 0 || !contentType) return null;

  const filledCount = Object.values(contentTypeInputs).filter((v) => {
    if (v === '' || v === false) return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return v != null;
  }).length;

  const missingRequiredCount = requiredFields.filter((f) => {
    const v = contentTypeInputs[f.key];
    if (v == null) return true;
    if (typeof v === 'string') return v.trim().length === 0;
    if (Array.isArray(v)) return v.length === 0;
    return false;
  }).length;

  const hasMissingRequired = missingRequiredCount > 0;

  return (
    <div
      className={`rounded-lg border bg-white p-3 ${
        hasMissingRequired ? 'border-amber-300' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText
            className={`h-4 w-4 ${hasMissingRequired ? 'text-amber-600' : 'text-teal-600'}`}
          />
          <span className="text-sm font-medium text-gray-700">Content Brief</span>
        </div>
        {hasMissingRequired ? (
          <Badge variant="warning" size="sm">{missingRequiredCount} required</Badge>
        ) : filledCount > 0 ? (
          <Badge variant="teal" size="sm">{filledCount}/{fields.length}</Badge>
        ) : null}
      </div>

      {requiredFields.length > 0 && (
        <div className="space-y-2 mb-3">
          <ContentTypeInputFields
            typeId={contentType}
            values={contentTypeInputs}
            onChange={handleChange}
            compact
            filterKeys={requiredFields.map((f) => f.key)}
          />
        </div>
      )}

      {optionalFields.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer select-none mb-2 list-none">
            <Plus className="h-3 w-3 transition-transform group-open:rotate-45" />
            <span>Optional fields ({optionalFields.length})</span>
          </summary>
          <p className="text-xs text-gray-400 mb-2">
            These tweak the AI output. Empty is fine — the AI will derive sensible defaults.
          </p>
          <ContentTypeInputFields
            typeId={contentType}
            values={contentTypeInputs}
            onChange={handleChange}
            compact
            filterKeys={optionalFields.map((f) => f.key)}
          />
        </details>
      )}
    </div>
  );
}
