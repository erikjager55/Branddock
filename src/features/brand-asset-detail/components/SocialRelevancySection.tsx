'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles, Leaf, Heart, Globe, ShieldCheck, Megaphone,
  ChevronDown, Plus, X, CheckCircle, Info, Award,
} from 'lucide-react';
import type {
  SocialRelevancyFrameworkData,
  SocialRelevancyPillar,
  SocialRelevancyStatement,
  SocialRelevancyAuthenticityScores,
} from '../types/framework.types';
import {
  PILLAR_CONFIGS,
  ACTIVISM_LEVELS,
  AUTHENTICITY_CRITERIA,
  UN_SDGS,
  REFERENCE_FRAMEWORKS,
  EMPTY_SOCIAL_RELEVANCY_DATA,
  calculatePillarScore,
  calculateGrandTotal,
  calculateAuthenticityAverage,
  getScoreThreshold,
  getGrandTotalThreshold,
} from '../constants/social-relevancy-constants';
import type { PillarConfig } from '../constants/social-relevancy-constants';
import { ProofPointsGuidanceBanner } from './shared/ProofPointsGuidanceBanner';

// ─── Props ──────────────────────────────────────────────────

interface SocialRelevancySectionProps {
  data: SocialRelevancyFrameworkData | null;
  isEditing: boolean;
  onUpdate: (data: SocialRelevancyFrameworkData) => void;
}

// ─── Helpers ────────────────────────────────────────────────

function normalize(raw: SocialRelevancyFrameworkData | null): SocialRelevancyFrameworkData {
  if (!raw) return EMPTY_SOCIAL_RELEVANCY_DATA;

  // Ensure each pillar has all 3 statements with fixed text from config
  const ensurePillar = (pillar: SocialRelevancyPillar | undefined, config: PillarConfig): SocialRelevancyPillar => {
    const existing = pillar?.statements ?? [];
    return {
      statements: config.statements.map((text, i) => ({
        text,
        score: existing[i]?.score ?? 0,
        evidence: existing[i]?.evidence ?? '',
        target: existing[i]?.target ?? '',
        timeline: existing[i]?.timeline ?? '',
      })),
      pillarReflection: pillar?.pillarReflection ?? '',
    };
  };

  return {
    ...EMPTY_SOCIAL_RELEVANCY_DATA,
    ...raw,
    milieu: ensurePillar(raw.milieu, PILLAR_CONFIGS[0]),
    mens: ensurePillar(raw.mens, PILLAR_CONFIGS[1]),
    maatschappij: ensurePillar(raw.maatschappij, PILLAR_CONFIGS[2]),
    proofPoints: Array.isArray(raw.proofPoints) ? raw.proofPoints : [],
    certifications: Array.isArray(raw.certifications) ? raw.certifications : [],
    sdgAlignment: Array.isArray(raw.sdgAlignment) ? raw.sdgAlignment : [],
    communicationPrinciples: Array.isArray(raw.communicationPrinciples) ? raw.communicationPrinciples : [],
    keyStakeholders: Array.isArray(raw.keyStakeholders) ? raw.keyStakeholders : [],
    activationChannels: Array.isArray(raw.activationChannels) ? raw.activationChannels : [],
    authenticityScores: {
      ...EMPTY_SOCIAL_RELEVANCY_DATA.authenticityScores,
      ...(raw.authenticityScores ?? {}),
    },
  };
}

const PILLAR_ICONS = { Leaf, Heart, Globe } as const;

function getPillarIcon(iconName: string) {
  return PILLAR_ICONS[iconName as keyof typeof PILLAR_ICONS] ?? Globe;
}

// ─── Score Bar (clickable 1-5 rating) ───────────────────────

function ScoreBar({ score, onChange, isEditing, color }: {
  score: number;
  onChange: (score: number) => void;
  isEditing: boolean;
  color: string;
}) {
  const colorMap: Record<string, { active: string; hover: string }> = {
    emerald: { active: 'bg-emerald-500', hover: 'hover:bg-emerald-200' },
    rose: { active: 'bg-rose-500', hover: 'hover:bg-rose-200' },
    blue: { active: 'bg-blue-500', hover: 'hover:bg-blue-200' },
    amber: { active: 'bg-amber-500', hover: 'hover:bg-amber-200' },
  };
  const colors = colorMap[color] ?? colorMap.emerald;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!isEditing}
          onClick={() => onChange(score === n ? 0 : n)}
          className={`h-7 w-7 rounded-md text-xs font-semibold transition-colors ${
            n <= score
              ? `${colors.active} text-white`
              : isEditing
                ? `bg-gray-100 text-gray-400 ${colors.hover}`
                : 'bg-gray-100 text-gray-300'
          } ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}
          aria-label={`Score ${n}`}
        >
          {n}
        </button>
      ))}
      <span className="ml-2 text-sm font-medium text-gray-500">{score > 0 ? `${score}/5` : '—'}</span>
    </div>
  );
}

// ─── Pillar Score Summary Bar ───────────────────────────────

function PillarScoreSummary({ score, maxScore, color }: {
  score: number;
  maxScore: number;
  color: string;
}) {
  const threshold = getScoreThreshold(score);
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const barColor: Record<string, string> = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    teal: 'bg-teal-500',
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor[threshold.color] ?? barColor[color] ?? 'bg-gray-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-12 text-right">{score}/{maxScore}</span>
    </div>
  );
}

// ─── Grand Total Display ────────────────────────────────────

function GrandTotalBar({ data }: { data: SocialRelevancyFrameworkData }) {
  const scores = PILLAR_CONFIGS.map(p => ({
    label: p.label,
    color: p.color,
    score: calculatePillarScore(data[p.key]),
  }));
  const total = calculateGrandTotal(data);
  const threshold = getGrandTotalThreshold(total);

  const badgeColor: Record<string, string> = {
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    teal: 'bg-teal-100 text-teal-700',
  };
  const borderColor: Record<string, string> = {
    red: 'border-red-200',
    amber: 'border-amber-200',
    emerald: 'border-emerald-200',
    teal: 'border-teal-200',
  };

  if (total === 0) return null;

  return (
    <div className={`rounded-xl border ${borderColor[threshold.color] ?? 'border-gray-200'} bg-white p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Social Relevancy Score</h4>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeColor[threshold.color] ?? ''}`}>
          {threshold.label}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {scores.map(s => {
          const pillarThreshold = getScoreThreshold(s.score);
          const textColor: Record<string, string> = {
            red: 'text-red-600',
            amber: 'text-amber-600',
            emerald: 'text-emerald-600',
            teal: 'text-teal-600',
          };
          return (
            <div key={s.label} className="text-center">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-lg font-bold ${textColor[pillarThreshold.color] ?? 'text-gray-700'}`}>
                {s.score}<span className="text-sm font-normal text-gray-400">/15</span>
              </p>
            </div>
          );
        })}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className={`text-lg font-bold ${badgeColor[threshold.color]?.split(' ')[1] ?? 'text-gray-700'}`}>
            {total}<span className="text-sm font-normal text-gray-400">/45</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── String List Editor (inline) ────────────────────────────

function StringListEditor({ items, isEditing, onAdd, onUpdate, onRemove, placeholder, emptyText }: {
  items: string[];
  isEditing: boolean;
  onAdd: () => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  emptyText: string;
}) {
  if (!isEditing) {
    if (items.filter(Boolean).length === 0) {
      return <p className="text-sm italic text-gray-400">{emptyText}</p>;
    }
    return (
      <div className="space-y-1.5">
        {items.filter(Boolean).map((item, i) => (
          <div key={`${i}-${item}`} className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700">{item}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={`${i}-${item.slice(0, 20)}`} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => onUpdate(i, e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
            placeholder={placeholder}
          />
          <button type="button" onClick={() => onRemove(i)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={onAdd} className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium">
        <Plus className="h-4 w-4" /> Add item
      </button>
    </div>
  );
}

// ─── Tag Input (for certifications, stakeholders, channels) ──

function TagInput({ tags, isEditing, onAdd, onRemove, placeholder }: {
  tags: string[];
  isEditing: boolean;
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      onAdd(input.trim());
      setInput('');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag, i) => tag ? (
          <span key={`${i}-${tag}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
            {tag}
            {isEditing && (
              <button type="button" onClick={() => onRemove(i)} className="text-gray-400 hover:text-red-500">
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ) : null)}
        {tags.filter(Boolean).length === 0 && !isEditing && (
          <p className="text-sm italic text-gray-400">No items yet</p>
        )}
      </div>
      {isEditing && (
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
        />
      )}
    </div>
  );
}

// ─── Card Header (standalone to prevent re-mount) ──────────

const CARD_BG_MAP: Record<string, string> = {
  teal: 'bg-teal-50', emerald: 'bg-emerald-50', rose: 'bg-rose-50',
  blue: 'bg-blue-50', amber: 'bg-amber-50', violet: 'bg-violet-50',
};
const CARD_TEXT_MAP: Record<string, string> = {
  teal: 'text-teal-600', emerald: 'text-emerald-600', rose: 'text-rose-600',
  blue: 'text-blue-600', amber: 'text-amber-600', violet: 'text-violet-600',
};

function CardHeader({ icon: Icon, color, title, subtitle, summary, isExpanded, onToggle }: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  title: string;
  subtitle: string;
  summary?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="flex items-start gap-3 w-full text-left"
      onClick={onToggle}
      aria-expanded={isExpanded}
    >
      <div className={`rounded-lg p-2 ${CARD_BG_MAP[color] ?? 'bg-gray-50'}`}>
        <Icon className={`h-5 w-5 ${CARD_TEXT_MAP[color] ?? 'text-gray-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
        {!isExpanded && summary && <div className="mt-2">{summary}</div>}
      </div>
      <ChevronDown className={`h-4 w-4 text-gray-400 mt-1 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────

/** Social Relevancy canvas with 6 cards based on Triple Bottom Line / B Corp / Brand Activism. */
export function SocialRelevancySection({ data, isEditing, onUpdate }: SocialRelevancySectionProps) {
  const [draft, setDraft] = useState<SocialRelevancyFrameworkData>(() => normalize(data));
  const [expandedCard, setExpandedCard] = useState<number | null>(1);
  const [showReference, setShowReference] = useState(false);

  useEffect(() => {
    setDraft(normalize(data));
  }, [data]);

  // Generic updater
  const handleChange = <K extends keyof SocialRelevancyFrameworkData>(field: K, value: SocialRelevancyFrameworkData[K]) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    onUpdate(next);
  };

  // Pillar statement updater
  const handleStatementChange = (
    pillarKey: 'milieu' | 'mens' | 'maatschappij',
    statementIndex: number,
    field: keyof SocialRelevancyStatement,
    value: string | number,
  ) => {
    const pillar = { ...draft[pillarKey] };
    const statements = [...pillar.statements];
    statements[statementIndex] = { ...statements[statementIndex], [field]: value };
    pillar.statements = statements;
    handleChange(pillarKey, pillar);
  };

  // Pillar reflection updater
  const handlePillarReflection = (pillarKey: 'milieu' | 'mens' | 'maatschappij', value: string) => {
    const pillar = { ...draft[pillarKey], pillarReflection: value };
    handleChange(pillarKey, pillar);
  };

  // Authenticity score updater
  const handleAuthScore = (key: keyof SocialRelevancyAuthenticityScores, value: number) => {
    handleChange('authenticityScores', { ...draft.authenticityScores, [key]: value });
  };

  // List helpers for string arrays
  const addListItem = (field: 'proofPoints' | 'communicationPrinciples') => {
    handleChange(field, [...draft[field], '']);
  };
  const updateListItem = (field: 'proofPoints' | 'communicationPrinciples', index: number, value: string) => {
    const arr = [...draft[field]];
    arr[index] = value;
    handleChange(field, arr);
  };
  const removeListItem = (field: 'proofPoints' | 'communicationPrinciples', index: number) => {
    handleChange(field, draft[field].filter((_, i) => i !== index));
  };

  // Tag helpers
  const addTag = (field: 'certifications' | 'keyStakeholders' | 'activationChannels', tag: string) => {
    if (!draft[field].includes(tag)) {
      handleChange(field, [...draft[field], tag]);
    }
  };
  const removeTag = (field: 'certifications' | 'keyStakeholders' | 'activationChannels', index: number) => {
    handleChange(field, draft[field].filter((_, i) => i !== index));
  };

  // SDG toggle
  const toggleSdg = (num: number) => {
    const current = [...draft.sdgAlignment];
    const idx = current.indexOf(num);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(num);
    }
    handleChange('sdgAlignment', current.sort((a, b) => a - b));
  };

  // ─── Accordion toggle helper ──────────────────────────────
  const toggleCard = (n: number) => setExpandedCard(expandedCard === n ? null : n);

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Card 1: Social Impact Foundation */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <CardHeader
          icon={Sparkles}
          color="teal"
          title="Social Impact Foundation"
          subtitle="Why does this brand care about social impact?"
          isExpanded={expandedCard === 1}
          onToggle={() => toggleCard(1)}
          summary={draft.impactStatement ? (
            <p className="text-xs text-gray-500 line-clamp-2">{draft.impactStatement}</p>
          ) : undefined}
        />

        {expandedCard === 1 && (
          <div className="mt-4 space-y-4 pl-12">
            {/* Impact Statement */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Impact Statement</label>
              {isEditing ? (
                <textarea
                  value={draft.impactStatement}
                  onChange={(e) => handleChange('impactStatement', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  rows={2}
                  placeholder="One powerful sentence: why does this brand care about social impact?"
                />
              ) : (
                <p className="text-sm text-gray-700">{draft.impactStatement || <span className="italic text-gray-400">Not yet defined</span>}</p>
              )}
            </div>

            {/* Impact Narrative */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Impact Narrative</label>
              {isEditing ? (
                <textarea
                  value={draft.impactNarrative}
                  onChange={(e) => handleChange('impactNarrative', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  rows={4}
                  placeholder="The backstory: what was the trigger, founding moment, or evolution that led to this commitment?"
                />
              ) : (
                <p className="text-sm text-gray-700">{draft.impactNarrative || <span className="italic text-gray-400">Not yet defined</span>}</p>
              )}
            </div>

            {/* Activism Level */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Brand Activism Level <span className="text-gray-400 font-normal">(Kotler & Sarkar)</span>
              </label>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-2">
                  {ACTIVISM_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => handleChange('activismLevel', draft.activismLevel === level.value ? '' : level.value)}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        draft.activismLevel === level.value
                          ? 'border-teal-400 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900">{level.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{level.description}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  {draft.activismLevel ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-teal-100 text-xs font-semibold text-teal-700">
                        {draft.activismLevel}
                      </span>
                      <span className="text-xs text-gray-500">
                        {ACTIVISM_LEVELS.find(l => l.value === draft.activismLevel)?.description}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm italic text-gray-400">Not yet selected</p>
                  )}
                </div>
              )}
            </div>

            {/* Reference Frameworks (collapsible) */}
            <div className="border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setShowReference(!showReference)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                <Info className="h-3.5 w-3.5" />
                <span>{showReference ? 'Hide' : 'Show'} Reference Frameworks</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${showReference ? 'rotate-180' : ''}`} />
              </button>
              {showReference && (
                <div className="mt-3 space-y-3">
                  {REFERENCE_FRAMEWORKS.map((fw) => (
                    <div key={fw.name} className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-gray-700">
                        {fw.name} <span className="font-normal text-gray-400">({fw.author}, {fw.year})</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{fw.description}</p>
                      <ul className="mt-1.5 space-y-0.5">
                        {fw.keyPoints.map((kp, i) => (
                          <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                            <span className="text-gray-300 mt-0.5">-</span>
                            {kp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cards 2-4: Three Pillars (Milieu / Mens / Maatschappij) */}
      {PILLAR_CONFIGS.map((pillarConfig, pillarIdx) => {
        const cardNum = pillarIdx + 2; // Cards 2, 3, 4
        const PillarIcon = getPillarIcon(pillarConfig.icon);
        const pillarData = draft[pillarConfig.key];
        const pillarScore = calculatePillarScore(pillarData);

        return (
          <div key={pillarConfig.key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <CardHeader
              icon={PillarIcon}
              color={pillarConfig.color}
              title={pillarConfig.label}
              subtitle={pillarConfig.subtitle}
              isExpanded={expandedCard === cardNum}
              onToggle={() => toggleCard(cardNum)}
              summary={pillarScore > 0 ? (
                <PillarScoreSummary score={pillarScore} maxScore={15} color={pillarConfig.color} />
              ) : undefined}
            />

            {expandedCard === cardNum && (
              <div className="mt-4 space-y-5 pl-12">
                {pillarData.statements.map((stmt, stmtIdx) => (
                  <div key={stmtIdx} className="space-y-2">
                    {/* Fixed statement text (always readonly) */}
                    <p className="text-sm font-medium text-gray-800">
                      <span className="text-gray-400 mr-1">{pillarIdx * 3 + stmtIdx + 1}.</span>
                      {stmt.text}
                    </p>

                    {/* Score */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-14 flex-shrink-0">Score:</span>
                      <ScoreBar
                        score={stmt.score}
                        onChange={(score) => handleStatementChange(pillarConfig.key, stmtIdx, 'score', score)}
                        isEditing={isEditing}
                        color={pillarConfig.color}
                      />
                    </div>

                    {/* Evidence */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Evidence</label>
                      {isEditing ? (
                        <textarea
                          value={stmt.evidence}
                          onChange={(e) => handleStatementChange(pillarConfig.key, stmtIdx, 'evidence', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                          rows={2}
                          placeholder="Concrete evidence supporting this score..."
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{stmt.evidence || <span className="italic text-gray-400">No evidence provided</span>}</p>
                      )}
                    </div>

                    {/* Target & Timeline (inline) */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Improvement target</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={stmt.target}
                            onChange={(e) => handleStatementChange(pillarConfig.key, stmtIdx, 'target', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                            placeholder="Specific goal..."
                          />
                        ) : (
                          <p className="text-sm text-gray-600">{stmt.target || <span className="italic text-gray-400">—</span>}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Timeline</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={stmt.timeline}
                            onChange={(e) => handleStatementChange(pillarConfig.key, stmtIdx, 'timeline', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                            placeholder="e.g. Q4 2026"
                          />
                        ) : (
                          <p className="text-sm text-gray-600">{stmt.timeline || <span className="italic text-gray-400">—</span>}</p>
                        )}
                      </div>
                    </div>

                    {stmtIdx < 2 && <hr className="border-gray-100" />}
                  </div>
                ))}

                {/* Pillar Reflection */}
                <div className="border-t border-gray-100 pt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pillar Reflection</label>
                  {isEditing ? (
                    <textarea
                      value={pillarData.pillarReflection}
                      onChange={(e) => handlePillarReflection(pillarConfig.key, e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                      rows={2}
                      placeholder={`Free reflection on your ${pillarConfig.label.toLowerCase()} impact as a whole...`}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{pillarData.pillarReflection || <span className="italic text-gray-400">No reflection yet</span>}</p>
                  )}
                </div>

                {/* Pillar Score */}
                <PillarScoreSummary score={pillarScore} maxScore={15} color={pillarConfig.color} />
              </div>
            )}
          </div>
        );
      })}

      {/* Grand Total Display (between cards 4 and 5) */}
      <GrandTotalBar data={draft} />

      {/* Card 5: Authenticity & Evidence */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <CardHeader
          icon={ShieldCheck}
          color="amber"
          title="Authenticity & Evidence"
          subtitle="Are the claims credible?"
          isExpanded={expandedCard === 5}
          onToggle={() => toggleCard(5)}
          summary={(() => {
            const avg = calculateAuthenticityAverage(draft.authenticityScores);
            return avg > 0 ? (
              <span className="text-xs text-gray-500">Authenticity score: {avg}%</span>
            ) : undefined;
          })()}
        />

        {expandedCard === 5 && (
          <div className="mt-4 space-y-4 pl-12">
            {/* Walk-the-talk assessment (6 criteria) */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Walk-the-Talk Assessment</label>
              <div className="space-y-3">
                {AUTHENTICITY_CRITERIA.map((criterion) => (
                  <div key={criterion.key} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700">{criterion.label}</p>
                      <p className="text-xs text-gray-500">{criterion.question}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <ScoreBar
                        score={draft.authenticityScores[criterion.key]}
                        onChange={(score) => handleAuthScore(criterion.key, score)}
                        isEditing={isEditing}
                        color="amber"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {(() => {
                const avg = calculateAuthenticityAverage(draft.authenticityScores);
                if (avg === 0) return null;
                return (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Overall authenticity:</span>
                    <span className="text-sm font-semibold text-amber-600">{avg}%</span>
                  </div>
                );
              })()}
            </div>

            {/* Proof Points */}
            <ProofPointsGuidanceBanner assetType="social-relevancy" />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Proof Points</label>
              <StringListEditor
                items={draft.proofPoints}
                isEditing={isEditing}
                onAdd={() => addListItem('proofPoints')}
                onUpdate={(i, v) => updateListItem('proofPoints', i, v)}
                onRemove={(i) => removeListItem('proofPoints', i)}
                placeholder="Add a concrete proof point..."
                emptyText="No proof points yet"
              />
            </div>

            {/* Certifications */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Certifications</label>
              <TagInput
                tags={draft.certifications}
                isEditing={isEditing}
                onAdd={(tag) => addTag('certifications', tag)}
                onRemove={(i) => removeTag('certifications', i)}
                placeholder="Type certification and press Enter (e.g. B Corp, ISO 14001)"
              />
            </div>

            {/* Anti-Greenwashing Statement */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Anti-Greenwashing Statement
                <span className="text-gray-400 font-normal ml-1">(honest acknowledgment of shortcomings)</span>
              </label>
              {isEditing ? (
                <textarea
                  value={draft.antiGreenwashingStatement}
                  onChange={(e) => handleChange('antiGreenwashingStatement', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  rows={3}
                  placeholder="Where does the brand fall short? What are you honest about?"
                />
              ) : (
                <p className="text-sm text-gray-700">{draft.antiGreenwashingStatement || <span className="italic text-gray-400">Not yet defined</span>}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card 6: Activation & Communication */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <CardHeader
          icon={Megaphone}
          color="violet"
          title="Activation & Communication"
          subtitle="How is impact communicated and anchored?"
          isExpanded={expandedCard === 6}
          onToggle={() => toggleCard(6)}
          summary={draft.sdgAlignment.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {draft.sdgAlignment.map(n => {
                const sdg = UN_SDGS.find(s => s.number === n);
                return sdg ? (
                  <span key={n} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white" style={{ backgroundColor: sdg.color }}>
                    {n}
                  </span>
                ) : null;
              })}
            </div>
          ) : undefined}
        />

        {expandedCard === 6 && (
          <div className="mt-4 space-y-4 pl-12">
            {/* SDG cross-reference */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">For how your transformative goals map to SDGs, see Transformative Goals.</p>
            </div>

            {/* SDG Alignment */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                UN Sustainable Development Goals <span className="text-gray-400 font-normal">(max 3 recommended)</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {UN_SDGS.map((sdg) => {
                  const selected = draft.sdgAlignment.includes(sdg.number);
                  return (
                    <button
                      key={sdg.number}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => toggleSdg(sdg.number)}
                      className={`text-left p-2 rounded-lg border text-xs transition-colors ${
                        selected
                          ? 'border-transparent text-white'
                          : isEditing
                            ? 'border-gray-200 text-gray-700 hover:border-gray-300'
                            : 'border-gray-100 text-gray-400'
                      } ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}
                      style={selected ? { backgroundColor: sdg.color } : undefined}
                    >
                      <span className="font-bold">{sdg.number}.</span> {sdg.name}
                    </button>
                  );
                })}
              </div>
              {draft.sdgAlignment.length > 3 && (
                <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  Consider focusing on max 3 SDGs for clearer impact (SDG Compass)
                </p>
              )}
            </div>

            {/* Communication Principles */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Communication Principles</label>
              <StringListEditor
                items={draft.communicationPrinciples}
                isEditing={isEditing}
                onAdd={() => addListItem('communicationPrinciples')}
                onUpdate={(i, v) => updateListItem('communicationPrinciples', i, v)}
                onRemove={(i) => removeListItem('communicationPrinciples', i)}
                placeholder="Add a communication principle..."
                emptyText="No communication principles defined"
              />
            </div>

            {/* Key Stakeholders */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Key Stakeholders</label>
              <TagInput
                tags={draft.keyStakeholders}
                isEditing={isEditing}
                onAdd={(tag) => addTag('keyStakeholders', tag)}
                onRemove={(i) => removeTag('keyStakeholders', i)}
                placeholder="Type stakeholder and press Enter"
              />
            </div>

            {/* Activation Channels */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Activation Channels</label>
              <TagInput
                tags={draft.activationChannels}
                isEditing={isEditing}
                onAdd={(tag) => addTag('activationChannels', tag)}
                onRemove={(i) => removeTag('activationChannels', i)}
                placeholder="Type channel and press Enter"
              />
            </div>

            {/* Annual Commitment */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Annual Commitment</label>
              {isEditing ? (
                <textarea
                  value={draft.annualCommitment}
                  onChange={(e) => handleChange('annualCommitment', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  rows={2}
                  placeholder="Concrete, measurable commitment for this year..."
                />
              ) : (
                <p className="text-sm text-gray-700">{draft.annualCommitment || <span className="italic text-gray-400">Not yet defined</span>}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
