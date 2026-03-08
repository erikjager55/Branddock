'use client';

import { useState, useEffect } from 'react';
import {
  Crown, Heart, MessageCircle, Palette, Megaphone, Globe,
  Plus, X, Info,
} from 'lucide-react';
import type { BrandArchetypeFrameworkData, WeSayNotThatPair } from '../types/framework.types';
import {
  ARCHETYPE_OPTIONS, POSITIONING_OPTIONS,
  getArchetypeById, getSubArchetypes,
} from '../constants/archetype-constants';

// ─── Empty defaults ──────────────────────────────────────────

const EMPTY_DATA: BrandArchetypeFrameworkData = {
  primaryArchetype: '',
  secondaryArchetype: '',
  blendRatio: '70/30',
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

export function BrandArchetypeSection({ data, isEditing, onUpdate }: BrandArchetypeSectionProps) {
  const [draft, setDraft] = useState<BrandArchetypeFrameworkData>(() => normalize(data));
  const [showArchetypeInfo, setShowArchetypeInfo] = useState(false);

  useEffect(() => {
    setDraft(normalize(data));
  }, [data]);

  const handleChange = (field: keyof BrandArchetypeFrameworkData, value: unknown) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    onUpdate(next);
  };

  /** When primary archetype changes, pre-populate core psychology fields from reference data */
  const handlePrimaryArchetypeChange = (archetypeId: string) => {
    const def = getArchetypeById(archetypeId);
    const next: BrandArchetypeFrameworkData = {
      ...draft,
      primaryArchetype: archetypeId,
      subArchetype: '', // Reset sub-archetype when primary changes
    };
    // Pre-populate from reference data if fields are empty
    if (def) {
      if (!draft.coreDesire) next.coreDesire = def.coreDesire;
      if (!draft.coreFear) next.coreFear = def.coreFear;
      if (!draft.brandGoal) next.brandGoal = def.goal;
      if (!draft.strategy) next.strategy = def.strategy;
      if (!draft.giftTalent) next.giftTalent = def.giftTalent;
      if (!draft.shadowWeakness) next.shadowWeakness = def.shadow;
      if (!draft.brandVoiceDescription) next.brandVoiceDescription = def.voiceStyle;
      if (draft.voiceAdjectives.length === 0) next.voiceAdjectives = [...def.voiceAdjectives];
      if (!draft.colorDirection) next.colorDirection = def.colorDirection;
      if (!draft.typographyDirection) next.typographyDirection = def.typographyDirection;
      if (!draft.imageryStyle) next.imageryStyle = def.imageryStyle;
      if (draft.brandExamples.length === 0) next.brandExamples = [...def.brandExamples];
      if (!draft.contentStrategy) next.contentStrategy = def.contentApproach;
      if (!draft.positioningApproach) next.positioningApproach = def.positioningApproach;
    }
    setDraft(next);
    onUpdate(next);
  };

  const d = normalize(data);
  const primaryDef = getArchetypeById(isEditing ? draft.primaryArchetype : d.primaryArchetype);
  const secondaryDef = getArchetypeById(isEditing ? draft.secondaryArchetype ?? '' : d.secondaryArchetype ?? '');
  const subOptions = getSubArchetypes(isEditing ? draft.primaryArchetype : d.primaryArchetype);

  return (
    <div className="space-y-4">
      {/* Card 1: Archetype Selection */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Crown className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">Brand Archetype</h2>
            <p className="text-sm text-gray-500">Your brand&apos;s narrative identity based on the 12 Jungian archetypes</p>
          </div>
          <button
            type="button"
            onClick={() => setShowArchetypeInfo(!showArchetypeInfo)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Info className="h-3.5 w-3.5" />
            {showArchetypeInfo ? 'Hide guide' : 'What are archetypes?'}
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
              Choose a <strong>primary archetype</strong> (60-70% of your brand expression) and optionally a
              <strong> secondary</strong> (20-30%) for nuance and differentiation.
            </p>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            {/* Primary Archetype */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Archetype</label>
              <select
                value={draft.primaryArchetype}
                onChange={(e) => handlePrimaryArchetypeChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
              >
                <option value="">Select an archetype...</option>
                {ARCHETYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Secondary Archetype */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Secondary Archetype</label>
                <select
                  value={draft.secondaryArchetype ?? ''}
                  onChange={(e) => handleChange('secondaryArchetype', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                >
                  <option value="">None</option>
                  {ARCHETYPE_OPTIONS.filter((o) => o.value !== draft.primaryArchetype).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Blend Ratio */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Blend Ratio</label>
                <input
                  type="text"
                  value={draft.blendRatio ?? '70/30'}
                  onChange={(e) => handleChange('blendRatio', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  placeholder="70/30"
                />
              </div>
            </div>

            {/* Sub-archetype */}
            {subOptions.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sub-archetype Variant</label>
                <select
                  value={draft.subArchetype ?? ''}
                  onChange={(e) => handleChange('subArchetype', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                >
                  <option value="">Select variant...</option>
                  {subOptions.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Display selected archetypes */}
            {d.primaryArchetype ? (
              <div className="flex flex-wrap gap-3">
                <ArchetypeBadge def={primaryDef} label="Primary" variant="primary" />
                {secondaryDef && <ArchetypeBadge def={secondaryDef} label="Secondary" variant="secondary" />}
                {d.blendRatio && (
                  <span className="inline-flex items-center text-xs text-gray-400 self-center">
                    Blend: {d.blendRatio}
                  </span>
                )}
                {d.subArchetype && (
                  <span className="inline-flex items-center text-xs bg-gray-100 text-gray-600 rounded-full px-3 py-1 self-center">
                    Variant: {d.subArchetype}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm italic text-gray-400">Select your brand archetype...</p>
            )}

            {/* Motto display */}
            {primaryDef && (
              <div className="bg-amber-50/50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-sm text-amber-700 italic">&ldquo;{primaryDef.motto}&rdquo;</p>
                <p className="text-xs text-amber-500 mt-1">{primaryDef.quadrantLabel}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card 2: Core Psychology */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
            <Heart className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Core Psychology</h2>
            <p className="text-sm text-gray-500">The fundamental desires, fears, and strategies of your archetype</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextCard
            label="Core Desire"
            description="The fundamental human need your brand fulfills"
            value={isEditing ? draft.coreDesire : d.coreDesire}
            isEditing={isEditing}
            onChange={(v) => handleChange('coreDesire', v)}
            placeholder="What deep human desire does your brand fulfill?"
          />
          <TextCard
            label="Core Fear"
            description="What your brand stands against and protects from"
            value={isEditing ? draft.coreFear : d.coreFear}
            isEditing={isEditing}
            onChange={(v) => handleChange('coreFear', v)}
            placeholder="What fear does your brand help people overcome?"
          />
          <TextCard
            label="Brand Goal"
            description="The ultimate aim from this archetype's perspective"
            value={isEditing ? draft.brandGoal : d.brandGoal}
            isEditing={isEditing}
            onChange={(v) => handleChange('brandGoal', v)}
            placeholder="What is your brand's ultimate goal?"
          />
          <TextCard
            label="Strategy"
            description="How your brand achieves its goal"
            value={isEditing ? draft.strategy : d.strategy}
            isEditing={isEditing}
            onChange={(v) => handleChange('strategy', v)}
            placeholder="How does your brand reach its goal?"
          />
          <TextCard
            label="Gift / Talent"
            description="The unique gift your brand brings to the world"
            value={isEditing ? draft.giftTalent : d.giftTalent}
            isEditing={isEditing}
            onChange={(v) => handleChange('giftTalent', v)}
            placeholder="What unique talent does your brand offer?"
          />
          <TextCard
            label="Shadow / Weakness"
            description="The pitfall when the archetype is overdone"
            value={isEditing ? draft.shadowWeakness : d.shadowWeakness}
            isEditing={isEditing}
            onChange={(v) => handleChange('shadowWeakness', v)}
            placeholder="What risks exist when your brand personality is pushed too far?"
            variant="warning"
          />
        </div>
      </div>

      {/* Card 3: Voice & Messaging */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Voice & Messaging</h2>
            <p className="text-sm text-gray-500">How your archetype communicates — tone, language, and guardrails</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Voice Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Voice Description</label>
            {isEditing ? (
              <textarea
                value={draft.brandVoiceDescription}
                onChange={(e) => handleChange('brandVoiceDescription', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
                rows={3}
                placeholder="Describe how your brand communicates..."
              />
            ) : d.brandVoiceDescription ? (
              <p className="mt-1 text-sm text-gray-700 leading-relaxed">{d.brandVoiceDescription}</p>
            ) : (
              <p className="mt-1 text-sm italic text-gray-400">Describe your brand voice...</p>
            )}
          </div>

          {/* Voice Adjectives */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Voice Adjectives (3-5)</label>
            <TagEditor
              items={isEditing ? draft.voiceAdjectives : d.voiceAdjectives}
              isEditing={isEditing}
              onAdd={(v) => handleChange('voiceAdjectives', [...draft.voiceAdjectives, v])}
              onRemove={(i) => handleChange('voiceAdjectives', draft.voiceAdjectives.filter((_, idx) => idx !== i))}
              placeholder="Add adjective..."
              emptyText="No voice adjectives defined"
            />
          </div>

          {/* Language Patterns */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Language Patterns</label>
            {isEditing ? (
              <textarea
                value={draft.languagePatterns}
                onChange={(e) => handleChange('languagePatterns', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
                rows={2}
                placeholder="Vocabulary, register, and language style..."
              />
            ) : d.languagePatterns ? (
              <p className="mt-1 text-sm text-gray-700 leading-relaxed">{d.languagePatterns}</p>
            ) : (
              <p className="mt-1 text-sm italic text-gray-400">Describe language patterns...</p>
            )}
          </div>

          {/* We Say / Not That */}
          <WeSayNotThatEditor
            items={isEditing ? draft.weSayNotThat : d.weSayNotThat}
            isEditing={isEditing}
            onAdd={() => handleChange('weSayNotThat', [...draft.weSayNotThat, { weSay: '', notThat: '' }])}
            onUpdate={(i, pair) => {
              const next = [...draft.weSayNotThat];
              next[i] = pair;
              handleChange('weSayNotThat', next);
            }}
            onRemove={(i) => handleChange('weSayNotThat', draft.weSayNotThat.filter((_, idx) => idx !== i))}
          />

          {/* Tone Variations */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tone Variations by Context</label>
            {isEditing ? (
              <textarea
                value={draft.toneVariations}
                onChange={(e) => handleChange('toneVariations', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
                rows={2}
                placeholder="How does tone adapt across email, social, advertising, customer service..."
              />
            ) : d.toneVariations ? (
              <p className="mt-1 text-sm text-gray-700 leading-relaxed">{d.toneVariations}</p>
            ) : (
              <p className="mt-1 text-sm italic text-gray-400">Describe tone variations per channel...</p>
            )}
          </div>

          {/* Blacklisted Phrases */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Blacklisted Phrases</label>
            <TagEditor
              items={isEditing ? draft.blacklistedPhrases : d.blacklistedPhrases}
              isEditing={isEditing}
              onAdd={(v) => handleChange('blacklistedPhrases', [...draft.blacklistedPhrases, v])}
              onRemove={(i) => handleChange('blacklistedPhrases', draft.blacklistedPhrases.filter((_, idx) => idx !== i))}
              placeholder="Add phrase your brand never uses..."
              emptyText="No blacklisted phrases defined"
              variant="danger"
            />
          </div>
        </div>
      </div>

      {/* Card 4: Visual Expression */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Palette className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Visual Expression</h2>
            <p className="text-sm text-gray-500">How the archetype translates into visual identity direction</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextCard
            label="Color Direction"
            description="Color palette guidance from archetype psychology"
            value={isEditing ? draft.colorDirection : d.colorDirection}
            isEditing={isEditing}
            onChange={(v) => handleChange('colorDirection', v)}
            placeholder="Recommended color palette direction..."
          />
          <TextCard
            label="Typography Direction"
            description="Font style and weight guidance"
            value={isEditing ? draft.typographyDirection : d.typographyDirection}
            isEditing={isEditing}
            onChange={(v) => handleChange('typographyDirection', v)}
            placeholder="Serif/sans-serif, weight, formality..."
          />
          <TextCard
            label="Imagery Style"
            description="Photography and illustration direction"
            value={isEditing ? draft.imageryStyle : d.imageryStyle}
            isEditing={isEditing}
            onChange={(v) => handleChange('imageryStyle', v)}
            placeholder="Photography mood, illustration approach..."
          />
          <TextCard
            label="Visual Motifs"
            description="Recurring symbols, patterns, and elements"
            value={isEditing ? draft.visualMotifs : d.visualMotifs}
            isEditing={isEditing}
            onChange={(v) => handleChange('visualMotifs', v)}
            placeholder="Symbols, patterns, recurring visual themes..."
          />
        </div>
      </div>

      {/* Card 5: Archetype in Action */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Megaphone className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Archetype in Action</h2>
            <p className="text-sm text-gray-500">How the archetype drives marketing, CX, content, and storytelling</p>
          </div>
        </div>

        <div className="space-y-4">
          <TextCard
            label="Marketing Expression"
            description="How the archetype manifests in campaigns and advertising"
            value={isEditing ? draft.marketingExpression : d.marketingExpression}
            isEditing={isEditing}
            onChange={(v) => handleChange('marketingExpression', v)}
            placeholder="How does the archetype show in your marketing?"
          />
          <TextCard
            label="Customer Experience"
            description="How the archetype shapes customer interactions"
            value={isEditing ? draft.customerExperience : d.customerExperience}
            isEditing={isEditing}
            onChange={(v) => handleChange('customerExperience', v)}
            placeholder="How does the archetype influence customer experience?"
          />
          <TextCard
            label="Content Strategy"
            description="What types of content this archetype creates"
            value={isEditing ? draft.contentStrategy : d.contentStrategy}
            isEditing={isEditing}
            onChange={(v) => handleChange('contentStrategy', v)}
            placeholder="What content fits your archetype?"
          />
          <TextCard
            label="Storytelling Approach"
            description="The narrative role and recurring themes"
            value={isEditing ? draft.storytellingApproach : d.storytellingApproach}
            isEditing={isEditing}
            onChange={(v) => handleChange('storytellingApproach', v)}
            placeholder="How does your archetype shape the stories you tell?"
          />
        </div>
      </div>

      {/* Card 6: Reference & Positioning */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Globe className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Reference & Positioning</h2>
            <p className="text-sm text-gray-500">Competitive landscape and brand examples sharing your archetype</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Brand Examples */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Brand Examples</label>
            <TagEditor
              items={isEditing ? draft.brandExamples : d.brandExamples}
              isEditing={isEditing}
              onAdd={(v) => handleChange('brandExamples', [...draft.brandExamples, v])}
              onRemove={(i) => handleChange('brandExamples', draft.brandExamples.filter((_, idx) => idx !== i))}
              placeholder="Add a reference brand..."
              emptyText="No reference brands added"
            />
          </div>

          {/* Positioning Approach */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Positioning Approach</label>
            {isEditing ? (
              <select
                value={draft.positioningApproach ?? ''}
                onChange={(e) => handleChange('positioningApproach', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
              >
                <option value="">Select approach...</option>
                {POSITIONING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label} — {opt.description}</option>
                ))}
              </select>
            ) : d.positioningApproach ? (
              <div className="mt-1">
                {(() => {
                  const opt = POSITIONING_OPTIONS.find((o) => o.value === d.positioningApproach);
                  return opt ? (
                    <span className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      <span className="font-medium text-gray-700">{opt.label}</span>
                      <span className="text-gray-400">{opt.description}</span>
                    </span>
                  ) : null;
                })()}
              </div>
            ) : (
              <p className="mt-1 text-sm italic text-gray-400">Select a positioning approach...</p>
            )}
          </div>

          {/* Competitive Landscape */}
          <TextCard
            label="Competitive Landscape"
            description="Which archetypes do your competitors use and how do you differentiate?"
            value={isEditing ? draft.competitiveLandscape : d.competitiveLandscape}
            isEditing={isEditing}
            onChange={(v) => handleChange('competitiveLandscape', v)}
            placeholder="Describe your competitors' archetype positions..."
          />
        </div>
      </div>
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
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 bg-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
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

interface ArchetypeBadgeProps {
  def: ReturnType<typeof getArchetypeById>;
  label: string;
  variant: 'primary' | 'secondary';
}

function ArchetypeBadge({ def, label, variant }: ArchetypeBadgeProps) {
  if (!def) return null;
  const bgClass = variant === 'primary' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200';
  const textClass = variant === 'primary' ? 'text-amber-700' : 'text-gray-600';

  return (
    <span className={`inline-flex items-center gap-2 ${bgClass} border rounded-xl px-4 py-2`}>
      <Crown className={`h-4 w-4 ${textClass}`} />
      <div>
        <p className={`text-sm font-semibold ${textClass}`}>{def.name}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </span>
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

  const tagBg = variant === 'danger' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-teal-50 border-teal-200 text-teal-700';

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
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface WeSayNotThatEditorProps {
  items: WeSayNotThatPair[];
  isEditing: boolean;
  onAdd: () => void;
  onUpdate: (index: number, pair: WeSayNotThatPair) => void;
  onRemove: (index: number) => void;
}

function WeSayNotThatEditor({ items, isEditing, onAdd, onUpdate, onRemove }: WeSayNotThatEditorProps) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        We Say / Not That
      </label>

      {!isEditing ? (
        items.length > 0 ? (
          <div className="mt-2 space-y-2">
            {items.filter((p) => p.weSay || p.notThat).map((pair, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-emerald-500 font-medium mb-0.5">We say</p>
                  <p className="text-sm text-emerald-700">{pair.weSay}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-400 font-medium mb-0.5">Not that</p>
                  <p className="text-sm text-red-600">{pair.notThat}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm italic text-gray-400">No we say / not that pairs defined</p>
        )
      ) : (
        <div className="mt-2 space-y-2">
          {items.map((pair, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="grid grid-cols-2 gap-2 flex-1">
                <input
                  type="text"
                  value={pair.weSay}
                  onChange={(e) => onUpdate(i, { ...pair, weSay: e.target.value })}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  placeholder="We say..."
                />
                <input
                  type="text"
                  value={pair.notThat}
                  onChange={(e) => onUpdate(i, { ...pair, notThat: e.target.value })}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-red-300 focus:ring-1 focus:ring-red-300"
                  placeholder="Not that..."
                />
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            <Plus className="h-4 w-4" />
            Add pair
          </button>
        </div>
      )}
    </div>
  );
}
