'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen, Eye, Compass, Sparkles, MessageCircle, Award, FileText,
  Plus, X, ChevronDown, Info, Check,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BrandStoryFrameworkData, AudienceAdaptations } from '../types/framework.types';
import { ProofPointsGuidanceBanner } from './shared/ProofPointsGuidanceBanner';
import {
  NARRATIVE_ARC_TYPES,
  EMOTIONAL_TERRITORY_SUGGESTIONS,
  BRAND_ROLE_OPTIONS,
  STORYTELLING_FRAMEWORKS,
} from '../constants/brand-story-constants';

// ─── Empty defaults ─────────────────────────────────────────

const EMPTY_ADAPTATIONS: AudienceAdaptations = {
  customers: '',
  investors: '',
  employees: '',
  partners: '',
};

const EMPTY_DATA: BrandStoryFrameworkData = {
  originStory: '',
  founderMotivation: '',
  coreBeliefStatement: '',
  worldContext: '',
  customerExternalProblem: '',
  customerInternalProblem: '',
  philosophicalProblem: '',
  stakesCostOfInaction: '',
  brandRole: '',
  empathyStatement: '',
  authorityCredentials: '',
  transformationPromise: '',
  customerSuccessVision: '',
  abtStatement: '',
  brandThemes: [],
  emotionalTerritory: [],
  keyNarrativeMessages: [],
  narrativeArc: '',
  proofPoints: [],
  valuesInAction: [],
  brandMilestones: [],
  elevatorPitch: '',
  manifestoText: '',
  audienceAdaptations: { ...EMPTY_ADAPTATIONS },
};

function normalize(raw: BrandStoryFrameworkData | null): BrandStoryFrameworkData {
  if (!raw) return EMPTY_DATA;
  return {
    ...EMPTY_DATA,
    ...raw,
    brandThemes: Array.isArray(raw.brandThemes) ? raw.brandThemes : [],
    emotionalTerritory: Array.isArray(raw.emotionalTerritory) ? raw.emotionalTerritory : [],
    keyNarrativeMessages: Array.isArray(raw.keyNarrativeMessages) ? raw.keyNarrativeMessages : [],
    proofPoints: Array.isArray(raw.proofPoints) ? raw.proofPoints : [],
    valuesInAction: Array.isArray(raw.valuesInAction) ? raw.valuesInAction : [],
    brandMilestones: Array.isArray(raw.brandMilestones) ? raw.brandMilestones : [],
    audienceAdaptations: raw.audienceAdaptations
      ? { ...EMPTY_ADAPTATIONS, ...raw.audienceAdaptations }
      : { ...EMPTY_ADAPTATIONS },
  };
}

// ─── Props ──────────────────────────────────────────────────

interface BrandStorySectionProps {
  data: BrandStoryFrameworkData | null;
  isEditing: boolean;
  onUpdate: (data: BrandStoryFrameworkData) => void;
}

// ─── Sub-components ─────────────────────────────────────────

/** Reusable tag editor for string arrays */
function TagEditor({
  tags,
  onAdd,
  onRemove,
  placeholder,
  suggestions,
  disabled,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  suggestions?: string[];
  disabled?: boolean;
}) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) {
        onAdd(input.trim());
      }
      setInput('');
    }
  };

  const filteredSuggestions = suggestions?.filter(
    (s) => !tags.includes(s) && s.toLowerCase().includes(input.toLowerCase()),
  );

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag, i) => (
          <span key={`${tag}-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-700">
            {tag}
            {!disabled && (
              <button type="button" onClick={() => onRemove(i)} className="text-gray-400 hover:text-gray-600">
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {filteredSuggestions && filteredSuggestions.length > 0 && input.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {filteredSuggestions.slice(0, 6).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { onAdd(s); setInput(''); }}
                  className="px-2 py-0.5 text-xs rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Reusable string list editor for proof points, milestones, etc. */
function StringListEditor({
  items,
  onAdd,
  onUpdate,
  onRemove,
  placeholder,
  disabled,
}: {
  items: string[];
  onAdd: () => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation('brand-asset-detail');
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={`item-${i}`} className="flex items-start gap-2">
          <span className="mt-2 h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs text-gray-500 font-medium">
            {i + 1}
          </span>
          {disabled ? (
            <p className="text-sm text-gray-700 flex-1 py-1.5">{item || <span className="text-gray-400 italic">{t('shared.notSet')}</span>}</p>
          ) : (
            <input
              type="text"
              value={item}
              onChange={(e) => onUpdate(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          )}
          {!disabled && (
            <button type="button" onClick={() => onRemove(i)} className="mt-1.5 text-gray-400 hover:text-red-500 transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('shared.addItem')}
        </button>
      )}
    </div>
  );
}

// ─── Card configuration ─────────────────────────────────────

interface CardConfig {
  number: number;
  Icon: typeof BookOpen;
  colorBg: string;
  colorText: string;
}

const CARDS: CardConfig[] = [
  { number: 1, Icon: BookOpen, colorBg: 'bg-amber-50', colorText: 'text-amber-600' },
  { number: 2, Icon: Eye, colorBg: 'bg-rose-50', colorText: 'text-rose-600' },
  { number: 3, Icon: Compass, colorBg: 'bg-primary-50', colorText: 'text-primary' },
  { number: 4, Icon: Sparkles, colorBg: 'bg-emerald-50', colorText: 'text-emerald-600' },
  { number: 5, Icon: MessageCircle, colorBg: 'bg-blue-50', colorText: 'text-blue-600' },
  { number: 6, Icon: Award, colorBg: 'bg-indigo-50', colorText: 'text-indigo-600' },
  { number: 7, Icon: FileText, colorBg: 'bg-violet-50', colorText: 'text-violet-600' },
];

// ─── Main component ─────────────────────────────────────────

/** Brand Story canvas with 7 sections based on StoryBrand/Hero's Journey/ABT frameworks. */
export function BrandStorySection({ data, isEditing, onUpdate }: BrandStorySectionProps) {
  const { t } = useTranslation('brand-asset-detail');
  const [draft, setDraft] = useState<BrandStoryFrameworkData>(() => normalize(data));
  const [expandedCard, setExpandedCard] = useState<number | null>(1);
  const [showFrameworkInfo, setShowFrameworkInfo] = useState(false);

  useEffect(() => {
    setDraft(normalize(data));
  }, [data]);

  const d = isEditing ? draft : normalize(data);

  // ─── Summary for collapsed cards (closes over d + t) ──────
  const getCardSummary = (card: number): string => {
    const notStarted = t('brandStory.summary.notStarted');
    switch (card) {
      case 1: {
        if (d.coreBeliefStatement) return d.coreBeliefStatement;
        if (d.originStory) return d.originStory.slice(0, 80) + (d.originStory.length > 80 ? '...' : '');
        return notStarted;
      }
      case 2: {
        const problems = [d.customerExternalProblem, d.customerInternalProblem, d.philosophicalProblem].filter(Boolean);
        return problems.length > 0 ? t('brandStory.summary.problemLayers', { count: problems.length }) : notStarted;
      }
      case 3:
        return d.brandRole ? t('brandStory.summary.role', { role: d.brandRole }) : notStarted;
      case 4:
        return d.transformationPromise ? d.transformationPromise.slice(0, 80) + (d.transformationPromise.length > 80 ? '...' : '') : notStarted;
      case 5: {
        const parts: string[] = [];
        if (d.narrativeArc) parts.push(d.narrativeArc);
        if (d.brandThemes.length > 0) parts.push(t('brandStory.summary.themes', { count: d.brandThemes.length }));
        if (d.keyNarrativeMessages.length > 0) parts.push(t('brandStory.summary.messages', { count: d.keyNarrativeMessages.length }));
        return parts.join(' · ') || notStarted;
      }
      case 6: {
        const total = d.proofPoints.length + d.valuesInAction.length + d.brandMilestones.length;
        return total > 0 ? t('brandStory.summary.evidenceItems', { count: total }) : notStarted;
      }
      case 7:
        return d.elevatorPitch ? t('brandStory.summary.elevatorDefined') : notStarted;
      default:
        return '';
    }
  };

  const handleChange = (field: keyof BrandStoryFrameworkData, value: unknown) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    onUpdate(next);
  };

  const handleAdaptationChange = (audience: keyof AudienceAdaptations, value: string) => {
    const next = { ...draft, audienceAdaptations: { ...draft.audienceAdaptations, [audience]: value } };
    setDraft(next);
    onUpdate(next);
  };

  // Tag array helpers
  const addTag = (field: 'brandThemes' | 'emotionalTerritory' | 'keyNarrativeMessages', tag: string) => {
    handleChange(field, [...draft[field], tag]);
  };
  const removeTag = (field: 'brandThemes' | 'emotionalTerritory' | 'keyNarrativeMessages', index: number) => {
    handleChange(field, draft[field].filter((_, i) => i !== index));
  };

  // String list helpers
  const addListItem = (field: 'proofPoints' | 'valuesInAction' | 'brandMilestones') => {
    handleChange(field, [...draft[field], '']);
  };
  const updateListItem = (field: 'proofPoints' | 'valuesInAction' | 'brandMilestones', index: number, value: string) => {
    const updated = [...draft[field]];
    updated[index] = value;
    handleChange(field, updated);
  };
  const removeListItem = (field: 'proofPoints' | 'valuesInAction' | 'brandMilestones', index: number) => {
    handleChange(field, draft[field].filter((_, i) => i !== index));
  };

  const toggleCard = (num: number) => {
    setExpandedCard(expandedCard === num ? null : num);
  };

  // ─── Render helpers ─────────────────────────────────────

  const renderField = (label: string, value: string, field: keyof BrandStoryFrameworkData, placeholder: string, rows = 3) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      {isEditing ? (
        <textarea
          value={(draft[field] as string) || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
        />
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {value || <span className="text-gray-400 italic">{t('shared.notSet')}</span>}
        </p>
      )}
    </div>
  );

  const renderInput = (label: string, value: string, field: keyof BrandStoryFrameworkData, placeholder: string) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      {isEditing ? (
        <input
          type="text"
          value={(draft[field] as string) || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      ) : (
        <p className="text-sm text-gray-700">
          {value || <span className="text-gray-400 italic">{t('shared.notSet')}</span>}
        </p>
      )}
    </div>
  );

  const renderCardWrapper = (config: CardConfig, children: React.ReactNode) => {
    const isExpanded = expandedCard === config.number;
    const summary = getCardSummary(config.number);

    return (
      <div key={config.number} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Card header — always visible, clickable for cards 2-7 */}
        <button
          type="button"
          onClick={() => config.number > 1 ? toggleCard(config.number) : undefined}
          className={`w-full flex items-start gap-3 p-6 text-left ${config.number > 1 ? 'cursor-pointer hover:bg-gray-50/50 transition-colors' : 'cursor-default'}`}
          aria-expanded={config.number === 1 ? undefined : isExpanded}
        >
          <div className={`h-10 w-10 rounded-xl ${config.colorBg} flex items-center justify-center flex-shrink-0`}>
            <config.Icon className={`h-5 w-5 ${config.colorText}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{t(`brandStory.cards.c${config.number}.title`)}</h2>
            <p className="text-sm text-gray-500">{t(`brandStory.cards.c${config.number}.subtitle`)}</p>
            {/* Collapsed summary */}
            {config.number > 1 && !isExpanded && (
              <p className="text-xs text-gray-400 mt-1 truncate">{summary}</p>
            )}
          </div>
          {config.number > 1 && (
            <ChevronDown className={`h-5 w-5 text-gray-400 flex-shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          )}
        </button>

        {/* Card body — always visible for card 1, toggle for others */}
        {(config.number === 1 || isExpanded) && (
          <div className="px-6 pb-6 space-y-5">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Collapsible framework reference guide */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowFrameworkInfo(!showFrameworkInfo)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
          {showFrameworkInfo ? t('brandStory.guide.hide') : t('brandStory.guide.show')}
        </button>
      </div>

      {showFrameworkInfo && (
        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-5 text-sm space-y-4">
          <div>
            <p className="font-semibold text-gray-800 mb-1">{t('brandStory.guide.corePrinciple')}</p>
            <p className="text-gray-600">{t('brandStory.guide.corePrincipleBody')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STORYTELLING_FRAMEWORKS.map((fw) => (
              <div key={fw.id} className="bg-white/70 rounded-lg p-3 space-y-1">
                <p className="font-medium text-gray-800 text-xs">{t(`brand-dna:storyFrameworks.${fw.id}.name`, { defaultValue: fw.name })} <span className="text-gray-400 font-normal">— {fw.author}</span></p>
                <p className="text-xs text-gray-500">{t(`brand-dna:storyFrameworks.${fw.id}.principle`, { defaultValue: fw.principle })}</p>
                <ul className="text-xs text-gray-500 space-y-0.5 mt-1">
                  {fw.elements.slice(0, 3).map((el, ei) => (
                    <li key={el} className="flex items-start gap-1">
                      <Check className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                      {t(`brand-dna:storyFrameworks.${fw.id}.elements.${ei}`, { defaultValue: el })}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card 1: Origin & Belief (always expanded) */}
      {renderCardWrapper(CARDS[0], (
        <>
          {renderField(t('brandStory.fields.originStory.label'), d.originStory, 'originStory', t('brandStory.fields.originStory.placeholder'), 4)}
          {renderField(t('brandStory.fields.founderMotivation.label'), d.founderMotivation, 'founderMotivation', t('brandStory.fields.founderMotivation.placeholder'), 3)}
          {renderInput(t('brandStory.fields.coreBelief.label'), d.coreBeliefStatement, 'coreBeliefStatement', t('brandStory.fields.coreBelief.placeholder'))}
        </>
      ))}

      {/* Card 2: The World We See — Context & Problem */}
      {renderCardWrapper(CARDS[1], (
        <>
          {renderField(t('brandStory.fields.worldContext.label'), d.worldContext, 'worldContext', t('brandStory.fields.worldContext.placeholder'), 3)}
          <div className="space-y-4 p-4 bg-rose-50/30 rounded-xl border border-rose-100">
            <p className="text-xs font-medium text-rose-600">{t('brandStory.fields.threeLayer')}</p>
            {renderInput(t('brandStory.fields.externalProblem.label'), d.customerExternalProblem, 'customerExternalProblem', t('brandStory.fields.externalProblem.placeholder'))}
            {renderInput(t('brandStory.fields.internalProblem.label'), d.customerInternalProblem, 'customerInternalProblem', t('brandStory.fields.internalProblem.placeholder'))}
            {renderInput(t('brandStory.fields.philosophicalProblem.label'), d.philosophicalProblem, 'philosophicalProblem', t('brandStory.fields.philosophicalProblem.placeholder'))}
          </div>
          {renderField(t('brandStory.fields.stakes.label'), d.stakesCostOfInaction, 'stakesCostOfInaction', t('brandStory.fields.stakes.placeholder'), 3)}
        </>
      ))}

      {/* Card 3: The Brand as Guide */}
      {renderCardWrapper(CARDS[2], (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('brandStory.fields.brandRoleLabel')}</label>
            {isEditing ? (
              <div className="grid grid-cols-2 gap-2">
                {BRAND_ROLE_OPTIONS.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleChange('brandRole', draft.brandRole === role.label ? '' : role.label)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      (isEditing ? draft.brandRole : d.brandRole) === role.label
                        ? 'border-primary-300 bg-primary-50 ring-1 ring-primary-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-800">{t(`brand-dna:brandRole.${role.id}.label`, { defaultValue: role.label })}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t(`brand-dna:brandRole.${role.id}.description`, { defaultValue: role.description })}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-700">
                {d.brandRole || <span className="text-gray-400 italic">Not set</span>}
              </p>
            )}
          </div>
          {renderField(t('brandStory.fields.empathy.label'), d.empathyStatement, 'empathyStatement', t('brandStory.fields.empathy.placeholder'), 3)}
          {renderField(t('brandStory.fields.authority.label'), d.authorityCredentials, 'authorityCredentials', t('brandStory.fields.authority.placeholder'), 3)}
        </>
      ))}

      {/* Card 4: Transformation & Resolution */}
      {renderCardWrapper(CARDS[3], (
        <>
          {renderField(t('brandStory.fields.transformation.label'), d.transformationPromise, 'transformationPromise', t('brandStory.fields.transformation.placeholder'), 4)}
          {renderField(t('brandStory.fields.successVision.label'), d.customerSuccessVision, 'customerSuccessVision', t('brandStory.fields.successVision.placeholder'), 4)}
        </>
      ))}

      {/* Card 5: Narrative Toolkit */}
      {renderCardWrapper(CARDS[4], (
        <>
          {renderField(t('brandStory.fields.abt.label'), d.abtStatement, 'abtStatement', t('brandStory.fields.abt.placeholder'), 4)}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('brandStory.fields.narrativeArcLabel')}</label>
            {isEditing ? (
              <div className="space-y-2">
                {NARRATIVE_ARC_TYPES.map((arc) => (
                  <button
                    key={arc.id}
                    type="button"
                    onClick={() => handleChange('narrativeArc', draft.narrativeArc === arc.label ? '' : arc.label)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      (isEditing ? draft.narrativeArc : d.narrativeArc) === arc.label
                        ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-800">{t(`brand-dna:narrativeArc.${arc.id}.label`, { defaultValue: arc.label })}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t(`brand-dna:narrativeArc.${arc.id}.description`, { defaultValue: arc.description })}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-700">
                {d.narrativeArc || <span className="text-gray-400 italic">Not set</span>}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('brandStory.fields.themes.label')} <span className="text-gray-400 font-normal">{t('brandStory.fields.themes.hint')}</span></label>
            <TagEditor
              tags={d.brandThemes}
              onAdd={(tag) => addTag('brandThemes', tag)}
              onRemove={(i) => removeTag('brandThemes', i)}
              placeholder={t('brandStory.fields.themes.placeholder')}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('brandStory.fields.emotional.label')} <span className="text-gray-400 font-normal">{t('brandStory.fields.emotional.hint')}</span></label>
            <TagEditor
              tags={d.emotionalTerritory}
              onAdd={(tag) => addTag('emotionalTerritory', tag)}
              onRemove={(i) => removeTag('emotionalTerritory', i)}
              placeholder={t('brandStory.fields.emotional.placeholder')}
              suggestions={EMOTIONAL_TERRITORY_SUGGESTIONS}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('brandStory.fields.keyMessages.label')} <span className="text-gray-400 font-normal">{t('brandStory.fields.keyMessages.hint')}</span></label>
            <TagEditor
              tags={d.keyNarrativeMessages}
              onAdd={(tag) => addTag('keyNarrativeMessages', tag)}
              onRemove={(i) => removeTag('keyNarrativeMessages', i)}
              placeholder={t('brandStory.fields.keyMessages.placeholder')}
              disabled={!isEditing}
            />
          </div>
        </>
      ))}

      {/* Card 6: Evidence & Milestones */}
      {renderCardWrapper(CARDS[5], (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">{t('brandStory.fields.proofPoints.label')} <span className="text-gray-400 font-normal">{t('brandStory.fields.proofPoints.hint')}</span></label>
            <ProofPointsGuidanceBanner assetType="story" />
            <StringListEditor
              items={d.proofPoints}
              onAdd={() => addListItem('proofPoints')}
              onUpdate={(i, v) => updateListItem('proofPoints', i, v)}
              onRemove={(i) => removeListItem('proofPoints', i)}
              placeholder={t('brandStory.fields.proofPoints.placeholder')}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">{t('brandStory.fields.valuesInAction.label')} <span className="text-gray-400 font-normal">{t('brandStory.fields.valuesInAction.hint')}</span></label>
            <StringListEditor
              items={d.valuesInAction}
              onAdd={() => addListItem('valuesInAction')}
              onUpdate={(i, v) => updateListItem('valuesInAction', i, v)}
              onRemove={(i) => removeListItem('valuesInAction', i)}
              placeholder={t('brandStory.fields.valuesInAction.placeholder')}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">{t('brandStory.fields.milestones.label')} <span className="text-gray-400 font-normal">{t('brandStory.fields.milestones.hint')}</span></label>
            <StringListEditor
              items={d.brandMilestones}
              onAdd={() => addListItem('brandMilestones')}
              onUpdate={(i, v) => updateListItem('brandMilestones', i, v)}
              onRemove={(i) => removeListItem('brandMilestones', i)}
              placeholder={t('brandStory.fields.milestones.placeholder')}
              disabled={!isEditing}
            />
          </div>
        </>
      ))}

      {/* Card 7: Story Expressions */}
      {renderCardWrapper(CARDS[6], (
        <>
          {renderField(t('brandStory.fields.elevator.label'), d.elevatorPitch, 'elevatorPitch', t('brandStory.fields.elevator.placeholder'), 4)}
          {renderField(t('brandStory.fields.manifesto.label'), d.manifestoText, 'manifestoText', t('brandStory.fields.manifesto.placeholder'), 8)}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-3">{t('brandStory.fields.audienceAdaptations.label')}</label>
            <p className="text-xs text-gray-400 mb-3">{t('brandStory.fields.audienceAdaptations.hint')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['customers', 'investors', 'employees', 'partners'] as const).map((audience) => (
                <div key={audience}>
                  <label className="block text-xs font-medium text-gray-500 mb-1 capitalize">{audience}</label>
                  {isEditing ? (
                    <textarea
                      value={draft.audienceAdaptations[audience] || ''}
                      onChange={(e) => handleAdaptationChange(audience, e.target.value)}
                      placeholder={t('brandStory.fields.audienceAdaptations.placeholder', { audience })}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                    />
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {d.audienceAdaptations[audience] || <span className="text-gray-400 italic">{t('shared.notSet')}</span>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      ))}
    </div>
  );
}
