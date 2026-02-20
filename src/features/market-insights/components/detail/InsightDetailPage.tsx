'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Edit3, Save, X, Trash2 } from 'lucide-react';
import { Button, SkeletonCard } from '@/components/shared';
import { PageShell } from '@/components/ui/layout';
import { useInsightDetail, useUpdateInsight, useDeleteInsight, useAddSource, useDeleteSource } from '../../hooks';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../../constants/insight-constants';
import type { InsightCategory, ImpactLevel, InsightTimeframe, InsightScope } from '../../types/market-insight.types';
import { InsightImpactBadge } from '../InsightImpactBadge';
import { ScopeTag } from '../ScopeTag';
import { TimeframeBadge } from '../TimeframeBadge';
import { RelevanceScoreCard } from './RelevanceScoreCard';
import { AddedDateCard } from './AddedDateCard';
import { IndustriesTagsSection } from './IndustriesTagsSection';
import { SourcesSection } from './SourcesSection';
import { HowToUseSection } from './HowToUseSection';
import { DeleteConfirmModal } from './DeleteConfirmModal';

const CATEGORY_OPTIONS: InsightCategory[] = ['TECHNOLOGY', 'ENVIRONMENTAL', 'SOCIAL', 'CONSUMER', 'BUSINESS'];
const IMPACT_OPTIONS: ImpactLevel[] = ['HIGH', 'MEDIUM', 'LOW'];
const TIMEFRAME_OPTIONS: InsightTimeframe[] = ['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM'];
const SCOPE_OPTIONS: InsightScope[] = ['MICRO', 'MESO', 'MACRO'];

interface InsightDetailPageProps {
  insightId: string;
  onBack: () => void;
}

export function InsightDetailPage({ insightId, onBack }: InsightDetailPageProps) {
  const { data: insight, isLoading } = useInsightDetail(insightId);
  const updateInsight = useUpdateInsight(insightId);
  const deleteInsight = useDeleteInsight(insightId);
  const addSourceMutation = useAddSource(insightId);
  const deleteSourceMutation = useDeleteSource(insightId);
  const [showDelete, setShowDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<InsightCategory>('TECHNOLOGY');
  const [editImpact, setEditImpact] = useState<ImpactLevel>('MEDIUM');
  const [editTimeframe, setEditTimeframe] = useState<InsightTimeframe>('MEDIUM_TERM');
  const [editScope, setEditScope] = useState<InsightScope>('MESO');

  // Sync edit state when entering edit mode
  useEffect(() => {
    if (insight && isEditing) {
      setEditTitle(insight.title);
      setEditDescription(insight.description ?? '');
      setEditCategory(insight.category);
      setEditImpact(insight.impactLevel);
      setEditTimeframe(insight.timeframe);
      setEditScope(insight.scope);
    }
  }, [insight, isEditing]);

  const handleSave = () => {
    updateInsight.mutateAsync({
      title: editTitle,
      description: editDescription || null,
      category: editCategory,
      impactLevel: editImpact,
      timeframe: editTimeframe,
      scope: editScope,
    }).then(() => {
      setIsEditing(false);
    });
  };

  const handleDelete = () => {
    deleteInsight.mutateAsync().then(() => {
      onBack();
    });
  };

  const handleAddSource = (name: string, url: string) => {
    addSourceMutation.mutate({ name, url });
  };

  const handleDeleteSource = (sourceId: string) => {
    deleteSourceMutation.mutate(sourceId);
  };

  if (isLoading || !insight) {
    return (
      <PageShell maxWidth="5xl">
        <div data-testid="skeleton-loader" className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="5xl">
      <div data-testid="insight-detail-page" className="space-y-6">
        {/* Breadcrumb */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Market Insights
        </button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-2xl font-bold text-gray-900 mb-2 w-full border-b-2 border-primary bg-transparent outline-none"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{insight.title}</h1>
            )}

            {isEditing ? (
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={editImpact}
                  onChange={(e) => setEditImpact(e.target.value as ImpactLevel)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-primary"
                >
                  {IMPACT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as InsightCategory)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-primary"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{CATEGORY_LABELS[opt]}</option>
                  ))}
                </select>
                <select
                  value={editScope}
                  onChange={(e) => setEditScope(e.target.value as InsightScope)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-primary"
                >
                  {SCOPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <select
                  value={editTimeframe}
                  onChange={(e) => setEditTimeframe(e.target.value as InsightTimeframe)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-primary"
                >
                  {TIMEFRAME_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <InsightImpactBadge level={insight.impactLevel} />
                <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded ${CATEGORY_COLORS[insight.category]}`}>
                  {CATEGORY_LABELS[insight.category]}
                </span>
                <ScopeTag scope={insight.scope} />
                <TimeframeBadge timeframe={insight.timeframe} />
              </div>
            )}
          </div>
        </div>

        {/* Score + Date cards */}
        <div className="grid grid-cols-2 gap-4">
          <RelevanceScoreCard score={insight.relevanceScore} />
          <AddedDateCard createdAt={insight.createdAt} source={insight.source} />
        </div>

        {/* Description */}
        {isEditing ? (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg p-3 outline-none focus:border-primary"
            />
          </div>
        ) : (
          insight.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600">{insight.description}</p>
            </div>
          )
        )}

        {/* Industries + Tags */}
        <IndustriesTagsSection
          industries={insight.industries}
          tags={insight.tags}
        />

        {/* Sources */}
        <SourcesSection
          sources={insight.sourceUrls}
          onAdd={handleAddSource}
          onDelete={handleDeleteSource}
        />

        {/* How to Use */}
        <HowToUseSection
          howToUse={insight.howToUse}
          onUseCampaign={() => alert('Campaign module coming in a future sprint')}
          onGenerateContent={() => alert('Content Studio coming in a future sprint')}
        />

        {/* Action row */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          {isEditing ? (
            <>
              <Button
                variant="primary"
                icon={Save}
                onClick={handleSave}
                isLoading={updateInsight.isPending}
              >
                Save
              </Button>
              <Button variant="ghost" icon={X} onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" icon={Edit3} onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button
                variant="ghost"
                icon={Trash2}
                onClick={() => setShowDelete(true)}
                className="border border-red-200 text-red-600 hover:bg-red-50"
              >
                Delete
              </Button>
            </>
          )}
        </div>

        {/* Delete Confirm */}
        {showDelete && (
          <div data-testid="delete-confirm-modal">
            <DeleteConfirmModal
              insightTitle={insight.title}
              isDeleting={deleteInsight.isPending}
              onConfirm={handleDelete}
              onCancel={() => setShowDelete(false)}
            />
          </div>
        )}
      </div>
    </PageShell>
  );
}
