'use client';

import React from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { useCanvasOrchestration } from '../../../hooks/useCanvasOrchestration';
import { Building2, Lightbulb, Route, Monitor, BookOpen, Plus, X, Sparkles, Search, Trash2, FileText, Image as ImageIcon } from 'lucide-react';
import { Badge, Skeleton, SkeletonText } from '@/components/shared';
import { WEBSITE_DELIVERABLE_TYPES } from '@/lib/ai/seo-pipeline.types';
import { STUDIO } from '@/lib/constants/design-tokens';
import type { BrandContextBlock } from '@/lib/ai/prompt-templates';
import type { VisualBriefSource, VisualStyleDirection } from '@/lib/ai/canvas-context';
import { suggestImageApproach, PHOTOGRAPHY_OPT_IN_COPY, type ImageSuggestion } from '@/lib/ai/image-suggestion';
import { useConsistentModels } from '@/features/consistent-models/hooks';
import {
  getContentTypeImageDefaults,
  getContentTypeAspectHint,
} from '../../../constants/image-briefing-defaults';
import { ContentTypeInputFields } from '../../shared/ContentTypeInputFields';
import {
  getContentTypeInputs,
  getRequiredInputs,
  getToneSuggestions,
  getCtaSuggestions,
  type ContentTypeInputValue,
} from '../../../lib/content-type-inputs';
import { useFormFillStore, type FormFillField } from '@/stores/useFormFillStore';

/**
 * Format een ContentTypeInputValue naar de preview-string die de AI ziet
 * via `currentValue` in de form-fill registry. Lege waarden worden `null`
 * zodat het systeem-prompt eerlijk laat zien dat het veld nog leeg is.
 */
function formatCurrentValue(v: ContentTypeInputValue | undefined): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(v)) return v.length > 0 ? v.join(', ') : null;
  if (typeof v === 'boolean') return v ? 'yes' : null;
  if (typeof v === 'number') return String(v);
  return null;
}

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
  const brief = useCanvasStore((s) => s.brief);
  const setBriefField = useCanvasStore((s) => s.setBriefField);
  const setContentTypeInput = useCanvasStore((s) => s.setContentTypeInput);
  const { generate, isGenerating } = useCanvasOrchestration(deliverableId);

  // Form-fill registry — exposeert briefing-velden aan de Brand Assistant
  // zodat `fill_form_fields` tool ze direct kan schrijven via de bestaande
  // store-actions. Re-registreert bij elke value-change zodat `currentValue`
  // in het systeem-prompt actueel is. Cleanup op unmount.
  const contentTypeFields = React.useMemo(
    () => (contentType ? getContentTypeInputs(contentType) : []),
    [contentType],
  );
  React.useEffect(() => {
    // F10 fix: brief-flush — bypass debounce-autosave race wanneer Brand
    // Assistant 2+ velden tegelijk fill. applyFill triggert dit één keer
    // ná alle setters via groupId='brief' + flush handler.
    const flushBrief = async () => {
      const latestBrief = useCanvasStore.getState().brief;
      try {
        await fetch(`/api/studio/${deliverableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: { brief: latestBrief } }),
        });
      } catch (err) {
        console.warn('[Step1Context] flushBrief failed:', err);
      }
    };

    const fields: FormFillField[] = [
      {
        key: 'objective',
        label: 'Objective',
        currentValue: brief.objective.trim() || null,
        setter: (value) => setBriefField('objective', String(value ?? '')),
        groupId: 'brief',
        flush: flushBrief,
      },
      {
        key: 'keyMessage',
        label: 'Key message',
        currentValue: brief.keyMessage.trim() || null,
        setter: (value) => setBriefField('keyMessage', String(value ?? '')),
        groupId: 'brief',
        flush: flushBrief,
      },
      {
        key: 'toneDirection',
        label: 'Tone of voice',
        currentValue: brief.toneDirection.trim() || null,
        setter: (value) =>
          setBriefField(
            'toneDirection',
            Array.isArray(value) ? value.join(', ') : String(value ?? ''),
          ),
        groupId: 'brief',
        flush: flushBrief,
      },
      {
        key: 'callToAction',
        label: 'Call to action',
        currentValue: brief.callToAction.trim() || null,
        setter: (value) => setBriefField('callToAction', String(value ?? '')),
        groupId: 'brief',
        flush: flushBrief,
      },
      ...contentTypeFields.map<FormFillField>((field) => ({
        key: field.key,
        label: field.label,
        currentValue: formatCurrentValue(contentTypeInputs[field.key]),
        setter: (value) => setContentTypeInput(field.key, value as ContentTypeInputValue),
      })),
    ];
    useFormFillStore.getState().registerFields(fields);
    return () => {
      useFormFillStore.getState().clearFields();
    };
  }, [
    brief.objective,
    brief.keyMessage,
    brief.toneDirection,
    brief.callToAction,
    contentTypeInputs,
    deliverableId,
    contentTypeFields,
    setBriefField,
    setContentTypeInput,
  ]);

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
      // F-pregen-flush (audit 2026-05-13): force-save alle wijzigingen vóór
      // generate zodat server-side gate niet leest van stale DB. Debounced
      // autosave (500ms) is anders niet gegarandeerd gefired bij snel-typen-
      // en-klikken. Eén combined PATCH met brief + contentTypeInputs +
      // visualBrief is goedkoper + atomic dan 3 parallelle.
      const store = useCanvasStore.getState();
      const flushPayload: Record<string, unknown> = { brief: store.brief };
      if (store.contentTypeInputsModified) {
        flushPayload.contentTypeInputs = store.contentTypeInputs;
      }
      if (store.visualBriefModified) {
        flushPayload.visualBrief = store.visualBrief;
      }
      try {
        await fetch(`/api/studio/${deliverableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: flushPayload }),
        });
        // Reset modified-flags zodat de debounced autosave-effects geen
        // duplicate PATCH meer schieten direct na deze flush.
        store.resetModifiedFlags();
      } catch (flushErr) {
        // Non-fatal — generate fallback to whatever DB has + gate-check
        // surfacees error naar user via globalErrorMessage.
        console.warn('[Step1Context] pre-generate flush failed:', flushErr);
      }
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
            <div className="space-y-1">
              <p className="text-xs text-gray-400 italic">No phase data available</p>
              <p className="text-[11px] text-gray-400">
                This content item isn&apos;t tied to a campaign blueprint phase yet.
                Generate a campaign blueprint to add awareness/consideration/conversion
                phases — or skip and the AI will infer tone from the briefing.
              </p>
            </div>
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

      {/* Content Brief — strategy fields (always shown) + type-specific
          fields (vary). Replaces the previous two-card split (Briefing +
          Content Brief) where tone-of-voice was asked twice in different
          formats. Strategy fields persist in `settings.brief`; type-specific
          fields persist in `settings.contentTypeInputs`. */}
      <ContentBriefSection />

      {/* Visual Brief — strategic visual direction (source + style chips).
          Source picks which pipeline runs at generate-time; style chips
          drive both text-prompt mediumConfig and image-prompt instructions.
          Persists in `settings.visualBrief`. Phase 1 wires the `generate`
          source end-to-end; library/compose/trained-style are placeholders. */}
      <VisualBriefSection />

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
 * Multi-select pills field — used for the Tone of Voice field. The user
 * picks one or more chips; the selection is stored as a comma-separated
 * string in brief.toneDirection (the orchestrator interpolates it
 * verbatim into the prompt, so "professional, casual" reads naturally).
 *
 * No free-text input — the curated vocabulary is the contract. If a
 * content category has no curated tone chips the field renders nothing.
 */
function TonePillsField({
  label,
  value,
  onChange,
  suggestions,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions?: ReadonlyArray<{ value: string; label: string }> | null;
}) {
  // Parse comma-separated value into a set for fast membership lookup.
  // Hook must run before any early return — gate is applied below.
  const activeSet = React.useMemo(() => {
    const items = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return new Set(items);
  }, [value]);

  // Hide entirely when no curated chips are available — falling back to
  // a textarea would defeat the "pills only" rule the user asked for.
  if (!suggestions || suggestions.length === 0) return null;

  const togglePill = (chipValue: string) => {
    const next = new Set(activeSet);
    if (next.has(chipValue)) {
      next.delete(chipValue);
    } else {
      next.add(chipValue);
    }
    // Preserve the suggestions order so re-toggling reads consistently.
    const ordered = suggestions
      .filter((s) => next.has(s.value))
      .map((s) => s.value);
    onChange(ordered.join(', '));
  };

  return (
    <div className="block">
      <span className="block text-[11px] font-medium text-gray-600 mb-1.5">{label}</span>
      <div className="flex flex-wrap gap-1">
        {suggestions.map((s) => {
          const active = activeSet.has(s.value);
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => togglePill(s.value)}
              className={
                active
                  ? 'inline-flex items-center px-2 py-0.5 text-[11px] rounded-full bg-teal-50 text-teal-700 border border-teal-300'
                  : 'inline-flex items-center px-2 py-0.5 text-[11px] rounded-full bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Brief field with optional suggestion chips. Used for Objective / Key
 * message / Call to action — fields where free-text is essential.
 * Clicking a chip fills the textarea (single-select); free text always
 * allowed.
 *
 * The Tone of Voice field uses TonePillsField above instead — that one
 * is multi-select pills only, no textarea.
 */
function BriefField({
  label,
  placeholder,
  value,
  onChange,
  suggestions,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  suggestions?: ReadonlyArray<{ value: string; label: string }> | null;
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
      {suggestions && suggestions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {suggestions.map((s) => {
            const active = value.trim() === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => onChange(s.value)}
                className={
                  active
                    ? 'inline-flex items-center px-2 py-0.5 text-[11px] rounded-full bg-teal-50 text-teal-700 border border-teal-300'
                    : 'inline-flex items-center px-2 py-0.5 text-[11px] rounded-full bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}
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
 * Unified Content Brief section — replaces the old Briefing + Content Brief
 * split where tone-of-voice and CTA were asked twice in different formats.
 * Two visual subgroups inside one card:
 *
 *   1. **Strategy** (always shown, 4 fields persisted in `settings.brief`):
 *      Objective · Key message · Tone of voice · Call to action.
 *      Tone + CTA show curated suggestion chips for the content category
 *      (long-form / sales / social / pr-hr) and fall back to free text for
 *      the rest.
 *
 *   2. **Type-specific** (varies, persisted in `settings.contentTypeInputs`):
 *      Required fields gate the Generate CTA below; optional fields tweak
 *      the AI output but never block.
 */
function ContentBriefSection() {
  const contentType = useCanvasStore((s) => s.contentType);
  const contentTypeInputs = useCanvasStore((s) => s.contentTypeInputs);
  const setContentTypeInput = useCanvasStore((s) => s.setContentTypeInput);
  const brief = useCanvasStore((s) => s.brief);
  const setBriefField = useCanvasStore((s) => s.setBriefField);

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

  const toneSuggestions = React.useMemo(
    () => (contentType ? getToneSuggestions(contentType) : null),
    [contentType],
  );
  const ctaSuggestions = React.useMemo(
    () => (contentType ? getCtaSuggestions(contentType) : null),
    [contentType],
  );

  const handleChange = React.useCallback(
    (key: string, value: ContentTypeInputValue) => {
      setContentTypeInput(key, value);
    },
    [setContentTypeInput],
  );

  const briefFilled = Object.values(brief).filter(
    (v) => typeof v === 'string' && v.trim().length > 0,
  ).length;

  const typeFieldsFilled = Object.values(contentTypeInputs).filter((v) => {
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
  const totalFilled = briefFilled + typeFieldsFilled;
  const totalFields = 4 + fields.length;

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
        ) : totalFilled > 0 ? (
          <Badge variant="teal" size="sm">{totalFilled}/{totalFields}</Badge>
        ) : null}
      </div>

      {/* ── Strategy ── */}
      <div className="space-y-2.5">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Strategy
        </p>
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
        <TonePillsField
          label="Tone of voice"
          value={brief.toneDirection}
          onChange={(v) => setBriefField('toneDirection', v)}
          suggestions={toneSuggestions}
        />
        <BriefField
          label="Call to action"
          placeholder={
            ctaSuggestions
              ? 'What should the audience do next? Pick a suggestion or write your own'
              : 'What should the audience do next?'
          }
          value={brief.callToAction}
          onChange={(v) => setBriefField('callToAction', v)}
          suggestions={ctaSuggestions}
        />
      </div>

      {/* ── Type-specific ── */}
      {contentType && fields.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {hasMissingRequired ? 'Type-specific (required)' : 'Type-specific'}
          </p>

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
            <div>
              {requiredFields.length > 0 && (
                <div className="border-t border-gray-100 pt-3 mb-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Optional fields ({optionalFields.length})
                  </p>
                  <p className="text-xs text-gray-400 mb-2">
                    These tweak the AI output. Empty is fine — the AI will derive sensible defaults.
                  </p>
                </div>
              )}
              <ContentTypeInputFields
                typeId={contentType}
                values={contentTypeInputs}
                onChange={handleChange}
                compact
                filterKeys={optionalFields.map((f) => f.key)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Visual Brief subsection ──────────────────────────────────

// F35 (audit 2026-05-13): 8 sources — voorheen waren upload/url/stock alleen
// bereikbaar via Step 3 InsertImageModal (los van visualBrief). Nu eerste-class
// in Visual Brief zodat Step 2 + Step 3 één panel delen.
const VISUAL_SOURCES: Array<{
  value: VisualBriefSource;
  label: string;
  description: string;
  ready: boolean;
}> = [
  {
    value: 'generate',
    label: 'Generate',
    description: 'AI creates the visual from scratch (Imagen / DALL-E / Flux)',
    ready: true,
  },
  {
    value: 'library',
    label: 'From library',
    description: 'Pick existing assets from your Media Library',
    ready: true,
  },
  {
    value: 'upload',
    label: 'Upload',
    description: 'Upload a new image file from your device',
    ready: true,
  },
  {
    value: 'url',
    label: 'Import URL',
    description: 'Paste a public image URL — Branddock imports it',
    ready: true,
  },
  {
    value: 'stock',
    label: 'Stock photos',
    description: 'Search Pexels stock photos by keyword',
    ready: true,
  },
  {
    value: 'compose',
    label: 'Compose',
    description: 'Combine 2-9 library images via natural language (e.g. "model holding the product")',
    ready: true,
  },
  {
    value: 'trained-style',
    label: 'Trained style',
    description: 'Apply your trained AI Model (illustration / photography / brand style)',
    ready: true,
  },
  {
    value: 'none',
    label: 'No visual',
    description: 'Skip image generation for this content item',
    ready: true,
  },
];

const STYLE_CHIPS: Array<{ value: VisualStyleDirection; label: string; description: string }> = [
  { value: 'lifestyle', label: 'Lifestyle', description: 'People in real situations using the product/service' },
  { value: 'product-shot', label: 'Product shot', description: 'Clean isolated subject, controlled lighting' },
  { value: 'quote-text', label: 'Quote / text', description: 'Typography-led, no central subject' },
  { value: 'behind-the-scenes', label: 'Behind the scenes', description: 'Candid team / process / workspace shots' },
  { value: 'ugc', label: 'UGC', description: 'User-generated style: handheld, raw, authentic' },
  { value: 'infographic', label: 'Infographic', description: 'Data viz, icons, structured layout' },
  { value: 'illustration', label: 'Illustration', description: 'Drawn / vector style' },
  { value: 'data-driven', label: 'Data-driven', description: 'Chart-led editorial, numbers in focus' },
];

/**
 * Visual Brief — Phase 1 of the four-source visual architecture (see
 * canvas-context.ts VisualBrief type). Asks two strategic questions:
 *
 *  1. Source — which pipeline runs when generating? (generate / library /
 *     compose / trained-style / none). Phase 1 wires `generate` and `none`
 *     fully; the others are placeholders that fall back to generate until
 *     Phases 3-5 add per-source pickers in Step 2.
 *
 *  2. Style direction — a chip from the canonical vocabulary, drives both
 *     text-prompt mediumConfig and image-prompt instructions via rich
 *     mapping in canvas-orchestrator. Free text is still allowed via the
 *     plain input below the chips.
 */
function VisualBriefSection() {
  const contentType = useCanvasStore((s) => s.contentType);
  const visualBrief = useCanvasStore((s) => s.visualBrief);
  const setSource = useCanvasStore((s) => s.setVisualBriefSource);
  const setStyleDirection = useCanvasStore((s) => s.setVisualBriefStyleDirection);
  const setBriefingText = useCanvasStore((s) => s.setVisualBriefBriefingText);
  const deliverableId = useCanvasStore((s) => s.deliverableId);

  const filledChip = visualBrief.styleDirection;
  const freeText = visualBrief.styleDirectionFreeText ?? '';
  const briefingText = visualBrief.briefingText ?? '';

  // Suggest-from-content button state. On click → POST suggest-visual-briefing,
  // fill briefing-textarea with response. Conservative: empty / parse-error
  // leaves the field unchanged.
  const [suggestLoading, setSuggestLoading] = React.useState(false);
  const [suggestError, setSuggestError] = React.useState<string | null>(null);
  const handleSuggestBriefing = React.useCallback(async () => {
    if (!deliverableId) return;
    setSuggestLoading(true);
    setSuggestError(null);
    try {
      const res = await fetch(`/api/studio/${deliverableId}/suggest-visual-briefing`, {
        method: 'POST',
      });
      if (!res.ok) {
        setSuggestError('Suggestion failed — try again later');
        return;
      }
      const data = (await res.json()) as { briefing?: string };
      const suggestion = data.briefing?.trim();
      if (suggestion) {
        setBriefingText(suggestion);
      }
    } catch (err) {
      console.error('[VisualBriefSection] suggest-visual-briefing failed', err);
      setSuggestError('Network error');
    } finally {
      setSuggestLoading(false);
    }
  }, [deliverableId, setBriefingText]);

  // Suggestion strip — content-type-aware defaults. Dismissible per session
  // (not persisted) so power-users can hide the nudge without it returning
  // every reload. See canvas-image-briefing-defaults task.
  const [suggestionDismissed, setSuggestionDismissed] = React.useState(false);
  const defaults = React.useMemo(
    () => getContentTypeImageDefaults(contentType),
    [contentType],
  );
  const aspectHint = React.useMemo(
    () => getContentTypeAspectHint(contentType),
    [contentType],
  );
  const suggestedChipLabel = React.useMemo(() => {
    if (!defaults) return null;
    if (!defaults.styleDirection) return 'no chip';
    return STYLE_CHIPS.find((c) => c.value === defaults.styleDirection)?.label ?? defaults.styleDirection;
  }, [defaults]);

  // Tailwind 4 in this project only safelists the teal/primary palette
  // (see globals.css @theme inline). Violet utilities get purged, so the
  // active states use inline hex styles to survive the build pipeline.
  const ACTIVE_HEX = '#7c3aed'; // violet-600
  const ACTIVE_BG = '#f5f3ff'; // violet-50
  const ACTIVE_BORDER = '#a78bfa'; // violet-400
  const CHIP_ACTIVE_BG = '#ede9fe'; // violet-100
  const CHIP_ACTIVE_TEXT = '#5b21b6'; // violet-800
  const CHIP_ACTIVE_BORDER = '#c4b5fd'; // violet-300

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2 mb-3">
        <ImageIcon className="h-4 w-4" style={{ color: ACTIVE_HEX }} />
        <span className="text-sm font-medium text-gray-700">Visual Brief</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        How the visual gets made. Source picks the pipeline, style direction
        steers both what the AI writes and what it generates.
      </p>

      {/* Suggestion strip — content-type-aware starting point. Not auto-applied;
          user clicks "Use defaults" to fill source + chip. */}
      {defaults && !suggestionDismissed && (
        <div
          className="mb-3 rounded-md p-2.5 flex items-start gap-2.5"
          style={{
            backgroundColor: ACTIVE_BG,
            border: `1px solid ${ACTIVE_BORDER}`,
          }}
        >
          <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: ACTIVE_HEX }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: '#4c1d95' }}>
              Suggested for {contentType ?? 'this content'}: {suggestedChipLabel}
              {aspectHint ? ` · ${aspectHint}` : ''}
              {defaults.modelHint ? ` · ${defaults.modelHint}` : ''}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: '#5b21b6' }}>
              {defaults.rationale}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setSource(defaults.source);
                  setStyleDirection(defaults.styleDirection);
                }}
                className="text-xs font-medium px-2.5 py-1 rounded transition-colors"
                style={{
                  backgroundColor: ACTIVE_HEX,
                  color: '#ffffff',
                }}
              >
                Use defaults
              </button>
              <button
                type="button"
                onClick={() => setSuggestionDismissed(true)}
                className="text-xs font-medium px-2.5 py-1 rounded transition-colors"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#5b21b6',
                  border: `1px solid ${CHIP_ACTIVE_BORDER}`,
                }}
              >
                Customize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Briefing — concrete subject description (overrules keyMessage as
          subject-seed in image-prompt builder). Distinct from style hints
          below (style notes belong in styleDirectionFreeText). */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Briefing
          </p>
          <button
            type="button"
            onClick={handleSuggestBriefing}
            disabled={suggestLoading || !deliverableId}
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded transition-colors disabled:opacity-50"
            style={{
              backgroundColor: suggestLoading ? '#e5e7eb' : ACTIVE_BG,
              color: suggestLoading ? '#9ca3af' : ACTIVE_HEX,
              border: `1px solid ${ACTIVE_BORDER}`,
            }}
          >
            <Sparkles className="h-3 w-3" />
            {suggestLoading ? 'Suggesting…' : 'Suggest from content'}
          </button>
        </div>
        <textarea
          value={briefingText}
          onChange={(e) => setBriefingText(e.target.value || null)}
          placeholder="Beschrijf wat het beeld moet tonen — wie, waar, wat, sfeer"
          rows={2}
          className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 resize-y"
          style={{ outlineColor: ACTIVE_HEX }}
        />
        <p className="text-[11px] text-gray-500">
          Subject voor het beeld. Overrules je key-message als ingevuld.
        </p>
        {suggestError && (
          <p className="text-[11px] text-red-600">{suggestError}</p>
        )}
      </div>

      {/* Source — radio cards */}
      <div className="space-y-2 mb-4">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Source
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {VISUAL_SOURCES.map((opt) => {
            const active = visualBrief.source === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSource(opt.value)}
                disabled={!opt.ready && !active}
                className={
                  opt.ready || active
                    ? 'text-left rounded-md p-2.5 transition-colors'
                    : 'text-left rounded-md p-2.5 cursor-not-allowed opacity-60'
                }
                style={{
                  border: active ? `2px solid ${ACTIVE_BORDER}` : '1px solid #e5e7eb',
                  backgroundColor: active ? ACTIVE_BG : opt.ready ? '#ffffff' : '#f9fafb',
                  // Account for the 1px → 2px border switch so the layout
                  // doesn't jump on selection.
                  margin: active ? '0' : '1px',
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm font-medium"
                    style={{ color: active ? '#4c1d95' : '#111827' }}
                  >
                    {opt.label}
                  </span>
                  {!opt.ready && (
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">soon</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{opt.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* F37 (audit 2026-05-13): chip-aware model-suggestion banner.
          Toont aanbevolen model + reasoning op basis van content-type +
          style-chip + workspace-LoRA-availability. Niet auto-applied;
          informatief + cost-transparant. */}
      {visualBrief.source !== 'none' && (
        <ImageModelSuggestionBanner
          contentTypeId={contentType ?? null}
          styleDirection={filledChip}
        />
      )}

      {/* Style direction — chips + free text */}
      {visualBrief.source !== 'none' && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Style direction
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STYLE_CHIPS.map((chip) => {
              const active = filledChip === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setStyleDirection(active ? null : chip.value)}
                  title={chip.description}
                  className="inline-flex items-center px-2 py-0.5 text-xs rounded-full transition-colors"
                  style={{
                    backgroundColor: active ? CHIP_ACTIVE_BG : '#f9fafb',
                    color: active ? CHIP_ACTIVE_TEXT : '#4b5563',
                    border: `1px solid ${active ? CHIP_ACTIVE_BORDER : '#e5e7eb'}`,
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
          <textarea
            value={freeText}
            onChange={(e) => setStyleDirection(filledChip, e.target.value)}
            placeholder={
              filledChip
                ? 'Add extra direction (mood, colors, references) — optional'
                : 'Or describe the visual direction in free text'
            }
            rows={2}
            className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 resize-y"
            style={{ outlineColor: ACTIVE_HEX }}
          />
        </div>
      )}
    </div>
  );
}

// ─── F37 (audit 2026-05-13): chip-aware model-suggestion banner ──────
// Toont per content-type + chip-keuze + LoRA-availability welke
// generation-approach het beste past. Pure informatie + transparantie;
// niet auto-applied. Photography opt-in onderaan, subtiel.

function ImageModelSuggestionBanner({
  contentTypeId,
  styleDirection,
}: {
  contentTypeId: string | null;
  styleDirection: VisualStyleDirection | null;
}) {
  const { data: modelsData } = useConsistentModels();
  const hasTrainedLora = React.useMemo(() => {
    const models = modelsData?.models ?? [];
    return models.some((m) => m.status === 'READY' && m.triggerWord);
  }, [modelsData]);

  const suggestion: ImageSuggestion = React.useMemo(
    () =>
      suggestImageApproach({
        contentTypeId,
        styleDirection,
        hasTrainedLora,
      }),
    [contentTypeId, styleDirection, hasTrainedLora],
  );

  return (
    <div className="mb-4 rounded-md bg-slate-50 border border-slate-200 p-3">
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0 text-slate-600" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-900">
            Branddock adviseert: <span className="text-slate-700">{suggestion.modelLabel}</span>
            <span className="ml-2 text-[11px] text-slate-500">~${suggestion.costPerImageUsd.toFixed(2)}/image</span>
          </p>
          <p className="text-[11px] mt-1 text-slate-600 leading-relaxed">{suggestion.reasoning}</p>
          {suggestion.strengths.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {suggestion.strengths.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-white border border-slate-200 text-slate-600"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {/* Photography opt-in — subtiel, NIET als default-suggestion */}
          <p className="mt-2 text-[10px] text-slate-400 italic">
            {PHOTOGRAPHY_OPT_IN_COPY.label}{' '}
            <span className="text-slate-500">{PHOTOGRAPHY_OPT_IN_COPY.description}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
