'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Trash2,
  Pencil,
  Save,
  X,
  Lock,
  Unlock,
  Plus,
  Shield,
  ShieldCheck,
  EyeOff,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Badge, Card, Select } from '@/components/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useTrendDetail, useUpdateTrend, useDeleteTrend, useActivateTrend, useDismissTrend, trendRadarKeys } from '../../hooks';
import { useTrendRadarStore } from '../../stores/useTrendRadarStore';
import { useLockState } from '@/hooks/useLockState';
import { TrendRelevanceCard } from './TrendRelevanceCard';
import { TrendActivationCard } from './TrendActivationCard';
import {
  CATEGORY_COLORS,
  IMPACT_COLORS,
  SCOPE_LABELS,
  TIMEFRAME_LABELS,
  DIRECTION_CONFIG,
  DETECTION_SOURCE_CONFIG,
} from '../../constants/trend-radar-constants';
import type { InsightCategory, InsightScope, ImpactLevel, InsightTimeframe } from '../../types/trend-radar.types';

interface TrendDetailPageProps {
  onNavigate: (section: string) => void;
}

const CATEGORY_OPTIONS = [
  { value: 'CONSUMER_BEHAVIOR', label: 'Consumer Behavior' },
  { value: 'TECHNOLOGY', label: 'Technology' },
  { value: 'MARKET_DYNAMICS', label: 'Market Dynamics' },
  { value: 'COMPETITIVE', label: 'Competitive' },
  { value: 'REGULATORY', label: 'Regulatory' },
];

const IMPACT_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const SCOPE_OPTIONS = [
  { value: 'MICRO', label: 'Micro' },
  { value: 'MESO', label: 'Meso' },
  { value: 'MACRO', label: 'Macro' },
];

const TIMEFRAME_OPTIONS = [
  { value: 'SHORT_TERM', label: '0-6 months' },
  { value: 'MEDIUM_TERM', label: '6-18 months' },
  { value: 'LONG_TERM', label: '18+ months' },
];

/** Trend detail page with hero header, edit mode, and lock/unlock */
export function TrendDetailPage({ onNavigate }: TrendDetailPageProps) {
  const queryClient = useQueryClient();
  const { selectedTrendId, isEditing, setIsEditing } = useTrendRadarStore();
  const { data: trend, isLoading } = useTrendDetail(selectedTrendId);
  const updateMutation = useUpdateTrend();
  const deleteMutation = useDeleteTrend();
  const activateMutation = useActivateTrend();
  const dismissMutation = useDismissTrend();

  // Edit state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<InsightCategory>('TECHNOLOGY');
  const [editImpactLevel, setEditImpactLevel] = useState<ImpactLevel>('MEDIUM');
  const [editScope, setEditScope] = useState<InsightScope>('MICRO');
  const [editTimeframe, setEditTimeframe] = useState<InsightTimeframe>('SHORT_TERM');
  const [editIndustries, setEditIndustries] = useState<string[]>([]);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editHowToUse, setEditHowToUse] = useState<string[]>([]);
  const [newIndustry, setNewIndustry] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newHowToUse, setNewHowToUse] = useState('');

  const prevTrendId = useRef<string | null>(null);

  // Lock state
  const lockState = useLockState({
    entityType: 'trend-radar',
    entityId: trend?.id ?? '',
    entityName: trend?.title ?? 'Trend',
    initialState: {
      isLocked: trend?.isLocked ?? false,
      lockedAt: trend?.lockedAt ?? null,
      lockedBy: trend?.lockedBy ?? null,
    },
    onLockChange: () => {
      if (selectedTrendId) {
        queryClient.invalidateQueries({ queryKey: trendRadarKeys.trendDetail(selectedTrendId) });
      }
      queryClient.invalidateQueries({ queryKey: trendRadarKeys.trends() });
    },
  });

  // Reset edit mode when navigating to a different trend
  useEffect(() => {
    if (trend?.id && trend.id !== prevTrendId.current) {
      prevTrendId.current = trend.id;
      setIsEditing(false);
    }
  }, [trend?.id, setIsEditing]);

  // Clean up edit state on unmount
  useEffect(() => {
    return () => {
      setIsEditing(false);
    };
  }, [setIsEditing]);

  // Sync edit state when entering edit mode
  const startEditing = useCallback(() => {
    if (!trend) return;
    setEditTitle(trend.title);
    setEditDescription(trend.description ?? '');
    setEditCategory(trend.category);
    setEditImpactLevel(trend.impactLevel);
    setEditScope(trend.scope);
    setEditTimeframe(trend.timeframe);
    setEditIndustries([...trend.industries]);
    setEditTags([...trend.tags]);
    setEditHowToUse([...trend.howToUse]);
    setIsEditing(true);
  }, [trend, setIsEditing]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
  }, [setIsEditing]);

  const saveEdits = useCallback(async () => {
    if (!trend) return;
    try {
      await updateMutation.mutateAsync({
        id: trend.id,
        body: {
          title: editTitle,
          description: editDescription || undefined,
          category: editCategory,
          impactLevel: editImpactLevel,
          scope: editScope,
          timeframe: editTimeframe,
          industries: editIndustries,
          tags: editTags,
          howToUse: editHowToUse,
        },
      });
      setIsEditing(false);
      toast.success('Trend updated');
    } catch {
      toast.error('Failed to save changes');
    }
  }, [trend, editTitle, editDescription, editCategory, editImpactLevel, editScope, editTimeframe, editIndustries, editTags, editHowToUse, updateMutation, setIsEditing]);

  const handleDelete = async () => {
    if (!trend) return;
    if (!confirm('Delete this trend? This action cannot be undone.')) return;
    try {
      await deleteMutation.mutateAsync(trend.id);
      onNavigate('trends');
    } catch {
      toast.error('Failed to delete trend');
    }
  };

  // Tag helpers
  const addIndustry = () => {
    const val = newIndustry.trim();
    if (val && !editIndustries.includes(val)) {
      setEditIndustries([...editIndustries, val]);
      setNewIndustry('');
    }
  };

  const removeIndustry = (i: number) => {
    setEditIndustries(editIndustries.filter((_, idx) => idx !== i));
  };

  const addTag = () => {
    const val = newTag.trim();
    if (val && !editTags.includes(val)) {
      setEditTags([...editTags, val]);
      setNewTag('');
    }
  };

  const removeTag = (i: number) => {
    setEditTags(editTags.filter((_, idx) => idx !== i));
  };

  const addHowToUse = () => {
    const val = newHowToUse.trim();
    if (val) {
      setEditHowToUse([...editHowToUse, val]);
      setNewHowToUse('');
    }
  };

  const removeHowToUse = (i: number) => {
    setEditHowToUse(editHowToUse.filter((_, idx) => idx !== i));
  };

  if (isLoading || !trend) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-64 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const categoryConfig = CATEGORY_COLORS[trend.category];
  const impactConfig = IMPACT_COLORS[trend.impactLevel];
  const directionConfig = trend.direction ? DIRECTION_CONFIG[trend.direction] : null;
  const sourceConfig = DETECTION_SOURCE_CONFIG[trend.detectionSource];

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => onNavigate('trends')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Trend Radar
      </button>

      {/* Hero header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4">
          {/* Category icon */}
          <div className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center ${categoryConfig.bg}`}>
            <span className={`text-2xl md:text-3xl font-bold ${categoryConfig.text}`}>
              {categoryConfig.label.charAt(0)}
            </span>
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-bold text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            ) : (
              <h1 className="text-xl font-bold text-gray-900">{trend.title}</h1>
            )}

            {/* Badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {isEditing ? (
                <>
                  <Select
                    value={editCategory}
                    onChange={(v) => setEditCategory(v as InsightCategory)}
                    options={CATEGORY_OPTIONS}
                  />
                  <Select
                    value={editImpactLevel}
                    onChange={(v) => setEditImpactLevel(v as ImpactLevel)}
                    options={IMPACT_OPTIONS}
                  />
                  <Select
                    value={editScope}
                    onChange={(v) => setEditScope(v as InsightScope)}
                    options={SCOPE_OPTIONS}
                  />
                  <Select
                    value={editTimeframe}
                    onChange={(v) => setEditTimeframe(v as InsightTimeframe)}
                    options={TIMEFRAME_OPTIONS}
                  />
                </>
              ) : (
                <>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${categoryConfig.bg} ${categoryConfig.text}`}>
                    {categoryConfig.label}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${impactConfig.bg} ${impactConfig.text}`}>
                    {impactConfig.label} Impact
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {SCOPE_LABELS[trend.scope]}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {TIMEFRAME_LABELS[trend.timeframe].label}
                  </span>
                  {directionConfig && (
                    <span className={`text-xs font-medium ${directionConfig.color}`}>
                      {directionConfig.label}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Detection metadata */}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span className={`font-medium px-1.5 py-0.5 rounded ${sourceConfig.color}`}>
                {sourceConfig.label}
              </span>
              <span>
                {new Date(trend.createdAt).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing ? (
              <>
                <Button variant="primary" size="sm" icon={Save} onClick={saveEdits} isLoading={updateMutation.isPending}>
                  Save
                </Button>
                <Button variant="ghost" size="sm" icon={X} onClick={cancelEditing}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Pencil}
                  onClick={startEditing}
                  disabled={lockState.isLocked}
                >
                  Edit
                </Button>
                <button
                  onClick={lockState.requestToggle}
                  disabled={lockState.isToggling}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  title={lockState.isLocked ? 'Unlock trend' : 'Lock trend'}
                >
                  {lockState.isLocked ? (
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Shield className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lock banner */}
      {lockState.isLocked && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">This trend is locked</p>
            <p className="text-xs text-amber-600">
              {lockState.lockedBy ? `Locked by ${lockState.lockedBy.name}` : 'Locked'}
              {lockState.lockedAt && ` on ${new Date(lockState.lockedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            </p>
          </div>
          <Button variant="ghost" size="sm" icon={Unlock} onClick={lockState.requestToggle}>
            Unlock
          </Button>
        </div>
      )}

      {/* Lock confirm dialog */}
      {lockState.showConfirm && (
        <div className="rounded-xl bg-white border border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <p className="text-sm text-gray-700">
            {lockState.isLocked
              ? 'Unlock this trend to allow editing?'
              : 'Lock this trend to protect it from changes?'}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={lockState.cancelToggle}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={lockState.confirmToggle} isLoading={lockState.isToggling}>
              {lockState.isLocked ? 'Unlock' : 'Lock'}
            </Button>
          </div>
        </div>
      )}

      {/* 2-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content — 2 cols */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Description</h3>
            {isEditing ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                className="w-full text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                placeholder="Describe this trend..."
              />
            ) : (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {trend.description || 'No description yet.'}
              </p>
            )}
          </Card>

          {/* Industries */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Industries</h3>
            <div className="flex flex-wrap gap-1.5">
              {(isEditing ? editIndustries : trend.industries).map((ind, i) => (
                <span key={ind} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                  {ind}
                  {isEditing && (
                    <button onClick={() => removeIndustry(i)} className="text-gray-400 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {!isEditing && trend.industries.length === 0 && (
                <span className="text-xs text-gray-400">No industries specified</span>
              )}
            </div>
            {isEditing && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIndustry(); } }}
                  placeholder="Add industry..."
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 flex-1 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <Button variant="ghost" size="sm" icon={Plus} onClick={addIndustry}>Add</Button>
              </div>
            )}
          </Card>

          {/* Tags */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {(isEditing ? editTags : trend.tags).map((tag, i) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 flex items-center gap-1">
                  {tag}
                  {isEditing && (
                    <button onClick={() => removeTag(i)} className="text-gray-400 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {!isEditing && trend.tags.length === 0 && (
                <span className="text-xs text-gray-400">No tags</span>
              )}
            </div>
            {isEditing && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Add tag..."
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 flex-1 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <Button variant="ghost" size="sm" icon={Plus} onClick={addTag}>Add</Button>
              </div>
            )}
          </Card>

          {/* How to Use */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">How to Use This Trend</h3>
            <ul className="space-y-1.5">
              {(isEditing ? editHowToUse : trend.howToUse).map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="flex-1">{tip}</span>
                  {isEditing && (
                    <button onClick={() => removeHowToUse(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
              {!isEditing && trend.howToUse.length === 0 && (
                <li className="text-xs text-gray-400">No usage tips yet</li>
              )}
            </ul>
            {isEditing && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newHowToUse}
                  onChange={(e) => setNewHowToUse(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHowToUse(); } }}
                  placeholder="Add usage tip..."
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 flex-1 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <Button variant="ghost" size="sm" icon={Plus} onClick={addHowToUse}>Add</Button>
              </div>
            )}
          </Card>

          {/* AI Analysis (read-only) */}
          {trend.aiAnalysis && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">AI Analysis</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{trend.aiAnalysis}</p>
            </Card>
          )}

          {/* Source Excerpt (read-only) */}
          {trend.rawExcerpt && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Source Excerpt</h3>
              <blockquote className="text-sm text-gray-600 italic border-l-2 border-gray-200 pl-3">
                {trend.rawExcerpt}
              </blockquote>
            </Card>
          )}
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-4">
          <TrendRelevanceCard score={trend.relevanceScore} confidence={trend.confidence} />

          {/* Detection Info */}
          <Card padding="none">
            <div className="p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detection Info</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Detection</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${sourceConfig.color}`}>
                    {sourceConfig.label}
                  </span>
                </div>
                {trend.researchJob && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Research</span>
                    <span className="text-xs text-gray-600 truncate max-w-[160px]" title={trend.researchJob.query}>
                      {trend.researchJob.query}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Detected</span>
                  <span className="text-xs text-gray-600">
                    {new Date(trend.createdAt).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <TrendActivationCard trend={trend} onToggle={() => activateMutation.mutate(trend.id)} disabled={lockState.isLocked} />

          {/* Dismiss action */}
          {!lockState.isLocked && (
            <button
              onClick={() => dismissMutation.mutate(trend.id)}
              disabled={dismissMutation.isPending}
              className={`flex items-center gap-2 w-full justify-center px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                trend.isDismissed
                  ? 'text-teal-600 hover:bg-teal-50'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {trend.isDismissed ? (
                <><Eye className="w-3.5 h-3.5" /> Restore Trend</>
              ) : (
                <><EyeOff className="w-3.5 h-3.5" /> Dismiss Trend</>
              )}
            </button>
          )}

          {/* Delete action */}
          {!lockState.isLocked && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2 w-full justify-center px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Trend'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
