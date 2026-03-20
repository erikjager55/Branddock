'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Trash2,
  Pencil,
  Save,
  X,
  Plus,
  EyeOff,
  Eye,
  Zap,
  ZapOff,
  ExternalLink,
  BarChart3,
  FileText,
  FileDown,
  FileJson,
  ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Badge, Card, Select } from '@/components/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useTrendDetail, useUpdateTrend, useDeleteTrend, useActivateTrend, useDismissTrend, trendRadarKeys } from '../../hooks';
import { useTrendRadarStore } from '../../stores/useTrendRadarStore';
import { useLockState } from '@/hooks/useLockState';
import { LockShield, LockStatusPill, LockBanner, LockOverlay, LockConfirmDialog } from '@/components/lock';
import { DeleteTrendConfirmDialog } from './DeleteTrendConfirmDialog';
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
import { exportTrendDetailPdf } from '../../utils/exportTrendRadarPdf';
import { exportTrendDetailJson } from '../../utils/exportTrendRadarJson';

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
  const [editImageUrl, setEditImageUrl] = useState('');
  const [heroImageError, setHeroImageError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Reset edit mode and image error when navigating to a different trend
  useEffect(() => {
    if (trend?.id && trend.id !== prevTrendId.current) {
      prevTrendId.current = trend.id;
      setIsEditing(false);
      setHeroImageError(false);
    }
  }, [trend?.id, setIsEditing]);

  // Clean up edit state on unmount
  useEffect(() => {
    return () => {
      setIsEditing(false);
    };
  }, [setIsEditing]);

  // Force-exit edit mode when locked
  useEffect(() => {
    if (lockState.isLocked && isEditing) {
      setIsEditing(false);
    }
  }, [lockState.isLocked, isEditing, setIsEditing]);

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
    setEditImageUrl(trend.imageUrl ?? '');
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
          imageUrl: editImageUrl.trim() || null,
        },
      });
      setHeroImageError(false);
      setIsEditing(false);
      toast.success('Trend updated');
    } catch {
      toast.error('Failed to save changes');
    }
  }, [trend, editTitle, editDescription, editCategory, editImpactLevel, editScope, editTimeframe, editIndustries, editTags, editHowToUse, editImageUrl, updateMutation, setIsEditing]);

  const handleDelete = async () => {
    if (!trend) return;
    try {
      await deleteMutation.mutateAsync(trend.id);
      setShowDeleteConfirm(false);
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
  const realSourceUrls = (trend.sourceUrls ?? []).filter((u: string) => !u.startsWith('search:'));
  const realSourceUrl = trend.sourceUrl && !trend.sourceUrl.startsWith('search:') ? trend.sourceUrl : null;

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
          {/* Category icon or image */}
          {trend.imageUrl && !heroImageError ? (
            <img
              src={trend.imageUrl}
              alt=""
              className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover"
              onError={() => setHeroImageError(true)}
            />
          ) : (
            <div className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center ${categoryConfig.bg}`}>
              <span className={`text-2xl md:text-3xl font-bold ${categoryConfig.text}`}>
                {categoryConfig.label.charAt(0)}
              </span>
            </div>
          )}

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
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
              <LockStatusPill
                isLocked={lockState.isLocked}
                lockedBy={lockState.lockedBy}
                lockedAt={lockState.lockedAt}
              />
            </div>

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
                <button
                  onClick={() => activateMutation.mutate(trend.id)}
                  disabled={activateMutation.isPending}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    trend.isActivated
                      ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                      : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  } disabled:opacity-50`}
                >
                  {trend.isActivated ? (
                    <><ZapOff className="w-4 h-4" /> Deactivate</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Activate</>
                  )}
                </button>
                <button
                  onClick={saveEdits}
                  disabled={updateMutation.isPending}
                  style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={cancelEditing}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-2 py-1.5"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={FileDown}
                  onClick={() => exportTrendDetailPdf(trend)}
                >
                  PDF
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={FileJson}
                  onClick={() => exportTrendDetailJson(trend)}
                >
                  JSON
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Pencil}
                  onClick={startEditing}
                  disabled={lockState.isLocked}
                >
                  Edit
                </Button>
                <LockShield
                  isLocked={lockState.isLocked}
                  isToggling={lockState.isToggling}
                  onClick={lockState.requestToggle}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lock banner */}
      <LockBanner
        isLocked={lockState.isLocked}
        onUnlock={lockState.requestToggle}
        lockedBy={lockState.lockedBy}
      />

      {/* Lock confirm dialog */}
      <LockConfirmDialog
        isOpen={lockState.showConfirm}
        isLocking={!lockState.isLocked}
        entityName={trend.title}
        entityType="trend-radar"
        onConfirm={lockState.confirmToggle}
        onCancel={lockState.cancelToggle}
      />

      {/* 2-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content — 2 cols */}
        <div className="md:col-span-2 space-y-6">
          {/* Why Now? */}
          {!isEditing && trend.whyNow && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <Zap className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Why Now?</p>
                <p className="text-sm text-amber-900">{trend.whyNow}</p>
              </div>
            </div>
          )}

          {/* Image — view mode */}
          {!isEditing && trend.imageUrl && !heroImageError && (
            <Card padding="none">
              <img
                src={trend.imageUrl}
                alt={trend.title}
                className="w-full max-h-64 object-cover rounded-xl"
                onError={() => setHeroImageError(true)}
              />
            </Card>
          )}

          {/* Image — edit mode */}
          {isEditing && (
            <LockOverlay isLocked={lockState.isLocked}>
              <Card>
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-gray-500" />
                  Trend Image
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    {editImageUrl && (
                      <button
                        type="button"
                        onClick={() => setEditImageUrl('')}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {editImageUrl && (
                    <img
                      src={editImageUrl}
                      alt="Preview"
                      className="w-full max-h-48 object-cover rounded-lg border border-gray-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block'; }}
                    />
                  )}
                </div>
              </Card>
            </LockOverlay>
          )}

          {/* Description */}
          <LockOverlay isLocked={lockState.isLocked}>
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
          </LockOverlay>

          {/* Industries */}
          <LockOverlay isLocked={lockState.isLocked}>
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
          </LockOverlay>

          {/* Tags */}
          <LockOverlay isLocked={lockState.isLocked}>
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
          </LockOverlay>

          {/* How to Use */}
          <LockOverlay isLocked={lockState.isLocked}>
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
          </LockOverlay>

          {/* AI Analysis (read-only) */}
          {trend.aiAnalysis && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">AI Analysis</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{trend.aiAnalysis}</p>
            </Card>
          )}

          {/* Data Points (read-only) */}
          {trend.dataPoints && trend.dataPoints.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                Key Data Points
              </h3>
              <ul className="space-y-1.5">
                {trend.dataPoints.map((dp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
                    {dp}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Sources (read-only) */}
          {realSourceUrls.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" />
                Sources ({realSourceUrls.length})
              </h3>
              <ul className="space-y-2">
                {realSourceUrls.map((url, i) => {
                  let displayUrl = url;
                  try {
                    displayUrl = new URL(url).hostname.replace(/^www\./, '');
                  } catch { /* keep raw url */ }
                  return (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{displayUrl}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {/* Fallback: single sourceUrl when sourceUrls is empty */}
          {realSourceUrls.length === 0 && realSourceUrl && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" />
                Source
              </h3>
              <a
                href={realSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{realSourceUrl}</span>
              </a>
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

          {/* Quality Scores */}
          {trend.scores && (
            <Card padding="none">
              <div className="p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quality Scores</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Novelty', value: trend.scores.novelty },
                    { label: 'Evidence', value: trend.scores.evidenceStrength },
                    { label: 'Growth Signal', value: trend.scores.growthSignal },
                    { label: 'Actionability', value: trend.scores.actionability },
                    { label: 'Strategic Relevance', value: trend.scores.strategicRelevance },
                    { label: 'Specificity', value: trend.scores.specificity },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-gray-500">{item.label}</span>
                        <span className="text-xs font-medium text-gray-700">{item.value}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.value >= 70 ? 'bg-teal-500' : item.value >= 50 ? 'bg-amber-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

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
                {trend.evidenceCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Evidence Sources</span>
                    <span className="text-xs font-medium text-gray-700">{trend.evidenceCount}</span>
                  </div>
                )}
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
          <button
            onClick={() => dismissMutation.mutate(trend.id)}
            disabled={dismissMutation.isPending || lockState.isLocked}
            className={`flex items-center gap-2 w-full justify-center px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              lockState.isLocked
                ? 'text-gray-300 cursor-not-allowed'
                : trend.isDismissed
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

          {/* Delete action */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteMutation.isPending || lockState.isLocked}
            className={`flex items-center gap-2 w-full justify-center px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              lockState.isLocked
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Trend
          </button>
        </div>
      </div>

      {/* Delete confirm dialog */}
      {showDeleteConfirm && (
        <DeleteTrendConfirmDialog
          trendTitle={trend.title}
          isDeleting={deleteMutation.isPending}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
