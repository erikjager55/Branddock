'use client';

import { useState, useEffect } from 'react';
import {
  Crown, Heart, Megaphone, Globe,
  Plus, X, Info, Check, ChevronDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BrandArchetypeFrameworkData } from '../types/framework.types';
import {
  ARCHETYPES, POSITIONING_OPTIONS,
  getArchetypeById, getSubArchetypes,
  buildAutoFillData,
} from '../constants/archetype-constants';
import { Modal } from '../../../components/shared';

// ─── Empty defaults ──────────────────────────────────────────

const EMPTY_DATA: BrandArchetypeFrameworkData = {
  primaryArchetype: '',
  subArchetype: '',
  coreDesire: '',
  coreFear: '',
  brandGoal: '',
  strategy: '',
  giftTalent: '',
  shadowWeakness: '',
  brandVoiceDescription: '',
  voiceAdjectives: [],
  languagePatterns: '',
  weSayNotThat: [],
  toneVariations: '',
  blacklistedPhrases: [],
  colorDirection: '',
  typographyDirection: '',
  imageryStyle: '',
  visualMotifs: '',
  archetypeInAction: '',
  marketingExpression: '',
  customerExperience: '',
  contentStrategy: '',
  storytellingApproach: '',
  brandExamples: [],
  positioningApproach: '',
  competitiveLandscape: '',
};

function normalize(raw: BrandArchetypeFrameworkData | null): BrandArchetypeFrameworkData {
  if (!raw) return EMPTY_DATA;
  return {
    ...EMPTY_DATA,
    ...raw,
    voiceAdjectives: Array.isArray(raw.voiceAdjectives) ? raw.voiceAdjectives : [],
    weSayNotThat: Array.isArray(raw.weSayNotThat) ? raw.weSayNotThat : [],
    blacklistedPhrases: Array.isArray(raw.blacklistedPhrases) ? raw.blacklistedPhrases : [],
    brandExamples: Array.isArray(raw.brandExamples) ? raw.brandExamples : [],
  };
}

// ─── Props ──────────────────────────────────────────────────

interface BrandArchetypeSectionProps {
  data: BrandArchetypeFrameworkData | null;
  isEditing: boolean;
  onUpdate: (data: BrandArchetypeFrameworkData) => void;
}

// ─── Component ──────────────────────────────────────────────

/** Fields that are auto-filled from archetype reference data (excludes deprecated voice/visual fields) */
const AUTO_FILL_FIELDS: (keyof BrandArchetypeFrameworkData)[] = [
  'coreDesire', 'coreFear', 'brandGoal', 'strategy', 'giftTalent', 'shadowWeakness',
  'marketingExpression', 'customerExperience', 'contentStrategy', 'storytellingApproach',
  'brandExamples', 'positioningApproach',
];

/** Check whether any auto-fillable field currently has content */
function hasAutoFillContent(d: BrandArchetypeFrameworkData): boolean {
  return AUTO_FILL_FIELDS.some((key) => {
    const val = d[key];
    if (Array.isArray(val)) return val.length > 0;
    return typeof val === 'string' && val.length > 0;
  });
}

export function BrandArchetypeSection({ data, isEditing, onUpdate }: BrandArchetypeSectionProps) {
  const { t } = useTranslation('brand-asset-detail');
  const [draft, setDraft] = useState<BrandArchetypeFrameworkData>(() => normalize(data));
  const [showArchetypeInfo, setShowArchetypeInfo] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingArchetypeId, setPendingArchetypeId] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(2);

  useEffect(() => {
    setDraft(normalize(data));
  }, [data]);

  const handleChange = (field: keyof BrandArchetypeFrameworkData, value: unknown) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    onUpdate(next);
  };

  /** Apply auto-fill data from the selected archetype onto the draft */
  const applyAutoFill = (
    baseDraft: BrandArchetypeFrameworkData,
    archetypeId: string,
  ): BrandArchetypeFrameworkData => {
    const fillData = buildAutoFillData(archetypeId);
    return { ...baseDraft, ...fillData } as BrandArchetypeFrameworkData;
  };

  /** When archetype changes, overwrite all auto-fillable fields */
  const handleArchetypeChange = (archetypeId: string) => {
    // If clearing the selection, just reset
    if (!archetypeId) {
      handleChange('primaryArchetype', '');
      return;
    }
    // If fields already have content, show confirmation
    if (draft.primaryArchetype && hasAutoFillContent(draft)) {
      setPendingArchetypeId(archetypeId);
      setShowConfirmDialog(true);
      return;
    }
    // Apply immediately
    const next = applyAutoFill(
      { ...draft, primaryArchetype: archetypeId, subArchetype: '' },
      archetypeId,
    );
    setDraft(next);
    onUpdate(next);
  };

  /** Confirm the pending archetype switch */
  const confirmArchetypeChange = () => {
    if (!pendingArchetypeId) return;
    const next = applyAutoFill(
      { ...draft, primaryArchetype: pendingArchetypeId, subArchetype: '' },
      pendingArchetypeId,
    );
    setDraft(next);
    onUpdate(next);
    setShowConfirmDialog(false);
    setPendingArchetypeId(null);
  };

  const d = normalize(data);
  const currentArchetypeId = isEditing ? draft.primaryArchetype : d.primaryArchetype;
  const hasArchetype = Boolean(currentArchetypeId);
  const primaryDef = getArchetypeById(currentArchetypeId);
  const subOptions = getSubArchetypes(currentArchetypeId);

  return (
    <div className="space-y-4">
      {/* Card 1: Archetype Selection */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Crown className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">{t('brandArchetype.selection.title')}</h2>
            <p className="text-sm text-gray-500">{t('brandArchetype.selection.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowArchetypeInfo(!showArchetypeInfo)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Info className="h-3.5 w-3.5" />
            {showArchetypeInfo ? t('brandArchetype.selection.hideGuide') : t('brandArchetype.selection.whatAre')}
          </button>
        </div>

        {/* Collapsible archetype guide */}
        {showArchetypeInfo && (
          <div className="mb-5 bg-amber-50/50 border border-amber-100 rounded-xl p-4 text-sm text-gray-600 space-y-2">
            <p>
              <strong>Brand archetypes</strong> are 12 universal personality patterns from Carl Jung&apos;s psychology,
              adapted for branding by Carol Pearson &amp; Margaret Mark. Research shows brands with a clearly defined
              archetype grow <strong>97% more in value</strong> over six years.
            </p>
            <p>
              Select the <strong>single archetype</strong> that best represents your brand&apos;s personality and narrative identity.
            </p>
          </div>
        )}

        {/* Archetype grid selector — always visible */}
        <ArchetypeGridSelector
          selectedId={isEditing ? draft.primaryArchetype : d.primaryArchetype}
          isEditing={isEditing}
          onSelectArchetype={(archetypeId) => {
            // Clicking the selected archetype → deselect it
            if (archetypeId === draft.primaryArchetype) {
              handleChange('primaryArchetype', '');
              return;
            }
            // Select or switch archetype
            handleArchetypeChange(archetypeId);
          }}
        />

        {/* Sub-archetype selector (only in edit mode with primary selected) */}
        {isEditing && subOptions.length > 0 && (
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('brandArchetype.selection.subLabel')}</label>
            <select
              value={draft.subArchetype ?? ''}
              onChange={(e) => handleChange('subArchetype', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
            >
              <option value="">{t('brandArchetype.selection.subSelect')}</option>
              {subOptions.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        )}

        {/* Sub-archetype display (view mode) */}
        {!isEditing && d.subArchetype && (
          <div className="mt-3">
            <span className="inline-flex items-center text-xs bg-gray-100 text-gray-600 rounded-full px-3 py-1">
              {t('brandArchetype.selection.variant', { variant: d.subArchetype })}
            </span>
          </div>
        )}

        {/* Motto display */}
        {primaryDef && (
          <div className="mt-4 bg-amber-50/50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-sm text-amber-700 italic">&ldquo;{t(`brand-dna:archetypes.${primaryDef.id}.motto`, { defaultValue: primaryDef.motto })}&rdquo;</p>
            <p className="text-xs text-amber-500 mt-1">{t(`brand-dna:quadrants.${primaryDef.quadrant}`, { defaultValue: primaryDef.quadrantLabel })}</p>
          </div>
        )}
      </div>

      {/* Callout when no archetype is selected */}
      {!hasArchetype && (
        <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-700">{t('brandArchetype.callout.title')}</p>
              <p className="text-sm text-gray-500 mt-1">
                {t('brandArchetype.callout.body')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cards 2-4 only appear after an archetype is selected */}
      {hasArchetype && <>

      {/* Card 2: Core Psychology */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <button
          type="button"
          onClick={() => setExpandedCard(expandedCard === 2 ? null : 2)}
          className="w-full flex items-start gap-3 text-left"
          aria-expanded={expandedCard === 2}
        >
          <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
            <Heart className="h-5 w-5 text-rose-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{t('brandArchetype.psychology.title')}</h2>
            <p className="text-sm text-gray-500">{t('brandArchetype.psychology.subtitle')}</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 mt-1 flex-shrink-0 transition-transform ${expandedCard === 2 ? 'rotate-180' : ''}`} />
        </button>

        {/* Collapsed summary */}
        {expandedCard !== 2 && (() => {
          const src = isEditing ? draft : d;
          const tags = [src.coreDesire, src.coreFear].filter(Boolean);
          return tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((t, i) => (
                <span key={i} className="text-xs bg-rose-50 text-rose-600 border border-rose-100 rounded-full px-2.5 py-0.5 truncate max-w-[200px]">{t}</span>
              ))}
            </div>
          ) : null;
        })()}

        {expandedCard === 2 && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextCard
              label={t('brandArchetype.psychology.coreDesire.label')}
              description={t('brandArchetype.psychology.coreDesire.description')}
              value={isEditing ? draft.coreDesire : d.coreDesire}
              isEditing={isEditing}
              onChange={(v) => handleChange('coreDesire', v)}
              placeholder={t('brandArchetype.psychology.coreDesire.placeholder')}
            />
            <TextCard
              label={t('brandArchetype.psychology.coreFear.label')}
              description={t('brandArchetype.psychology.coreFear.description')}
              value={isEditing ? draft.coreFear : d.coreFear}
              isEditing={isEditing}
              onChange={(v) => handleChange('coreFear', v)}
              placeholder={t('brandArchetype.psychology.coreFear.placeholder')}
            />
            <TextCard
              label={t('brandArchetype.psychology.brandGoal.label')}
              description={t('brandArchetype.psychology.brandGoal.description')}
              value={isEditing ? draft.brandGoal : d.brandGoal}
              isEditing={isEditing}
              onChange={(v) => handleChange('brandGoal', v)}
              placeholder={t('brandArchetype.psychology.brandGoal.placeholder')}
            />
            <TextCard
              label={t('brandArchetype.psychology.strategy.label')}
              description={t('brandArchetype.psychology.strategy.description')}
              value={isEditing ? draft.strategy : d.strategy}
              isEditing={isEditing}
              onChange={(v) => handleChange('strategy', v)}
              placeholder={t('brandArchetype.psychology.strategy.placeholder')}
            />
            <TextCard
              label={t('brandArchetype.psychology.giftTalent.label')}
              description={t('brandArchetype.psychology.giftTalent.description')}
              value={isEditing ? draft.giftTalent : d.giftTalent}
              isEditing={isEditing}
              onChange={(v) => handleChange('giftTalent', v)}
              placeholder={t('brandArchetype.psychology.giftTalent.placeholder')}
            />
            <TextCard
              label={t('brandArchetype.psychology.shadowWeakness.label')}
              description={t('brandArchetype.psychology.shadowWeakness.description')}
              value={isEditing ? draft.shadowWeakness : d.shadowWeakness}
              isEditing={isEditing}
              onChange={(v) => handleChange('shadowWeakness', v)}
              placeholder={t('brandArchetype.psychology.shadowWeakness.placeholder')}
              variant="warning"
            />
          </div>
        )}
      </div>

      {/* Info banner: Voice & Visual are in Brand Personality */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Voice, tone, and visual expression are defined in the <strong>Brand Personality</strong> asset.
        </p>
      </div>

      {/* Card 3: Archetype in Action */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <button
          type="button"
          onClick={() => setExpandedCard(expandedCard === 3 ? null : 3)}
          className="w-full flex items-start gap-3 text-left"
          aria-expanded={expandedCard === 3}
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Megaphone className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{t('brandArchetype.action.title')}</h2>
            <p className="text-sm text-gray-500">{t('brandArchetype.action.subtitle')}</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 mt-1 flex-shrink-0 transition-transform ${expandedCard === 3 ? 'rotate-180' : ''}`} />
        </button>

        {/* Collapsed summary */}
        {expandedCard !== 3 && (() => {
          const src = isEditing ? draft : d;
          const fields = [src.marketingExpression, src.customerExperience, src.contentStrategy, src.storytellingApproach];
          const defined = fields.filter(Boolean).length;
          return (
            <p className="mt-3 text-xs text-gray-500">{t('brandArchetype.action.fieldsDefined', { count: defined })}</p>
          );
        })()}

        {expandedCard === 3 && (
          <div className="mt-5 space-y-4">
            <TextCard
              label={t('brandArchetype.action.marketingExpression.label')}
              description={t('brandArchetype.action.marketingExpression.description')}
              value={isEditing ? draft.marketingExpression : d.marketingExpression}
              isEditing={isEditing}
              onChange={(v) => handleChange('marketingExpression', v)}
              placeholder={t('brandArchetype.action.marketingExpression.placeholder')}
            />
            <TextCard
              label={t('brandArchetype.action.customerExperience.label')}
              description={t('brandArchetype.action.customerExperience.description')}
              value={isEditing ? draft.customerExperience : d.customerExperience}
              isEditing={isEditing}
              onChange={(v) => handleChange('customerExperience', v)}
              placeholder={t('brandArchetype.action.customerExperience.placeholder')}
            />
            <TextCard
              label={t('brandArchetype.action.contentStrategy.label')}
              description={t('brandArchetype.action.contentStrategy.description')}
              value={isEditing ? draft.contentStrategy : d.contentStrategy}
              isEditing={isEditing}
              onChange={(v) => handleChange('contentStrategy', v)}
              placeholder={t('brandArchetype.action.contentStrategy.placeholder')}
            />
            <TextCard
              label={t('brandArchetype.action.storytellingApproach.label')}
              description={t('brandArchetype.action.storytellingApproach.description')}
              value={isEditing ? draft.storytellingApproach : d.storytellingApproach}
              isEditing={isEditing}
              onChange={(v) => handleChange('storytellingApproach', v)}
              placeholder={t('brandArchetype.action.storytellingApproach.placeholder')}
            />
          </div>
        )}
      </div>

      {/* Card 4: Reference & Positioning */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <button
          type="button"
          onClick={() => setExpandedCard(expandedCard === 4 ? null : 4)}
          className="w-full flex items-start gap-3 text-left"
          aria-expanded={expandedCard === 4}
        >
          <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Globe className="h-5 w-5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{t('brandArchetype.reference.title')}</h2>
            <p className="text-sm text-gray-500">{t('brandArchetype.reference.subtitle')}</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 mt-1 flex-shrink-0 transition-transform ${expandedCard === 4 ? 'rotate-180' : ''}`} />
        </button>

        {/* Collapsed summary */}
        {expandedCard !== 4 && (() => {
          const src = isEditing ? draft : d;
          const examples = src.brandExamples.filter(Boolean);
          const posOpt = POSITIONING_OPTIONS.find((o) => o.value === src.positioningApproach);
          return (examples.length > 0 || posOpt) ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {examples.map((ex, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded-full px-2.5 py-0.5">{ex}</span>
              ))}
              {posOpt && (
                <span className="text-xs bg-primary-50 text-primary border border-primary-100 rounded-full px-2.5 py-0.5">{t(`brand-dna:positioning.${posOpt.value}.label`, { defaultValue: posOpt.label })}</span>
              )}
            </div>
          ) : null;
        })()}

        {expandedCard === 4 && (
          <div className="mt-5 space-y-4">
            {/* Brand Examples */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('brandArchetype.reference.examplesLabel')}</label>
              <TagEditor
                items={isEditing ? draft.brandExamples : d.brandExamples}
                isEditing={isEditing}
                onAdd={(v) => handleChange('brandExamples', [...draft.brandExamples, v])}
                onRemove={(i) => handleChange('brandExamples', draft.brandExamples.filter((_, idx) => idx !== i))}
                placeholder={t('brandArchetype.reference.examplesPlaceholder')}
                emptyText={t('brandArchetype.reference.examplesEmpty')}
              />
            </div>

            {/* Positioning Approach */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('brandArchetype.reference.positioningLabel')}</label>
              {isEditing ? (
                <select
                  value={draft.positioningApproach ?? ''}
                  onChange={(e) => handleChange('positioningApproach', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                >
                  <option value="">{t('brandArchetype.reference.positioningSelect')}</option>
                  {POSITIONING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{t(`brand-dna:positioning.${opt.value}.label`, { defaultValue: opt.label })} — {t(`brand-dna:positioning.${opt.value}.description`, { defaultValue: opt.description })}</option>
                  ))}
                </select>
              ) : d.positioningApproach ? (
                <div className="mt-1">
                  {(() => {
                    const opt = POSITIONING_OPTIONS.find((o) => o.value === d.positioningApproach);
                    return opt ? (
                      <span className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                        <span className="font-medium text-gray-700">{t(`brand-dna:positioning.${opt.value}.label`, { defaultValue: opt.label })}</span>
                        <span className="text-gray-400">{t(`brand-dna:positioning.${opt.value}.description`, { defaultValue: opt.description })}</span>
                      </span>
                    ) : null;
                  })()}
                </div>
              ) : (
                <p className="mt-1 text-sm italic text-gray-400">{t('brandArchetype.reference.positioningEmpty')}</p>
              )}
            </div>

            {/* Competitive Landscape */}
            <TextCard
              label={t('brandArchetype.reference.competitiveLabel')}
              description={t('brandArchetype.reference.competitiveDescription')}
              value={isEditing ? draft.competitiveLandscape : d.competitiveLandscape}
              isEditing={isEditing}
              onChange={(v) => handleChange('competitiveLandscape', v)}
              placeholder={t('brandArchetype.reference.competitivePlaceholder')}
            />
          </div>
        )}
      </div>

      </>}

      {/* Confirmation Dialog for Archetype Switch */}
      <Modal
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setPendingArchetypeId(null);
        }}
        title={t('brandArchetype.modal.title')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('brandArchetype.modal.body1')}
          </p>
          <p className="text-sm text-gray-500">
            {t('brandArchetype.modal.body2')}
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowConfirmDialog(false);
                setPendingArchetypeId(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('brandArchetype.modal.cancel')}
            </button>
            <button
              type="button"
              onClick={confirmArchetypeChange}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:opacity-90 transition-colors"
            >
              {t('brandArchetype.modal.confirm')}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

interface TextCardProps {
  label: string;
  description: string;
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  placeholder: string;
  variant?: 'default' | 'warning';
}

function TextCard({ label, description, value, isEditing, onChange, placeholder, variant = 'default' }: TextCardProps) {
  const bgClass = variant === 'warning' ? 'bg-amber-50/30 border-amber-100' : 'bg-gray-50/50 border-gray-100';

  return (
    <div className={`${bgClass} border rounded-xl p-4`}>
      <div className="mb-2">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      {isEditing ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 bg-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
          rows={2}
          placeholder={placeholder}
        />
      ) : value ? (
        <p className="text-sm text-gray-700 leading-relaxed">{value}</p>
      ) : (
        <p className="text-sm italic text-gray-400">{placeholder}</p>
      )}
    </div>
  );
}

/** Quadrant color mapping for archetype cards */
const QUADRANT_COLORS: Record<string, { dot: string; selectedBg: string; selectedBorder: string }> = {
  stability: { dot: 'bg-blue-400', selectedBg: 'bg-blue-50', selectedBorder: 'border-blue-300' },
  mastery: { dot: 'bg-red-400', selectedBg: 'bg-red-50', selectedBorder: 'border-red-300' },
  freedom: { dot: 'bg-emerald-400', selectedBg: 'bg-emerald-50', selectedBorder: 'border-emerald-300' },
  belonging: { dot: 'bg-amber-400', selectedBg: 'bg-amber-50', selectedBorder: 'border-amber-300' },
};

interface ArchetypeGridSelectorProps {
  selectedId: string;
  isEditing: boolean;
  onSelectArchetype: (id: string) => void;
}

function ArchetypeGridSelector({ selectedId, isEditing, onSelectArchetype }: ArchetypeGridSelectorProps) {
  const { t } = useTranslation('brand-asset-detail');
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
      {ARCHETYPES.map((arch) => {
        const selected = arch.id === selectedId;
        const colors = QUADRANT_COLORS[arch.quadrant] ?? QUADRANT_COLORS.stability;

        return (
          <button
            key={arch.id}
            type="button"
            disabled={!isEditing}
            onClick={() => onSelectArchetype(arch.id)}
            className={`
              text-left rounded-xl border-2 p-3 transition-all
              ${selected
                ? `${colors.selectedBg} ${colors.selectedBorder} shadow-sm`
                : 'bg-white border-gray-100 hover:border-gray-300'
              }
              ${isEditing ? 'cursor-pointer' : 'cursor-default'}
              ${!isEditing && !selected ? 'opacity-50' : ''}
            `}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {selected ? (
                <div className="h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-500">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              ) : (
                <div className={`h-2.5 w-2.5 rounded-full ${colors.dot} flex-shrink-0`} />
              )}
              <span className={`text-xs font-semibold truncate flex-1 ${selected ? 'text-gray-900' : 'text-gray-600'}`}>
                {t(`brand-dna:archetypes.${arch.id}.name`, { defaultValue: arch.name }).replace('The ', '')}
              </span>
            </div>

            <p className="text-[10px] text-gray-400 leading-tight line-clamp-2 pl-0.5">
              {t(`brand-dna:archetypes.${arch.id}.motto`, { defaultValue: arch.motto })}
            </p>
          </button>
        );
      })}
    </div>
  );
}

interface TagEditorProps {
  items: string[];
  isEditing: boolean;
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  emptyText: string;
  variant?: 'default' | 'danger';
}

function TagEditor({ items, isEditing, onAdd, onRemove, placeholder, emptyText, variant = 'default' }: TagEditorProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const tagBg = variant === 'danger' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-primary-50 border-primary-200 text-primary-700';

  if (!isEditing) {
    if (items.length === 0) {
      return <p className="mt-1 text-sm italic text-gray-400">{emptyText}</p>;
    }
    return (
      <div className="mt-1 flex flex-wrap gap-2">
        {items.filter(Boolean).map((item, i) => (
          <span key={i} className={`inline-flex items-center text-xs border rounded-full px-3 py-1 ${tagBg}`}>
            {item}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-1 space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className={`inline-flex items-center gap-1 text-xs border rounded-full px-3 py-1 ${tagBg}`}>
            {item}
            <button type="button" onClick={() => onRemove(i)} className="ml-0.5 hover:opacity-70">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 text-sm text-primary hover:text-primary-700 font-medium"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

