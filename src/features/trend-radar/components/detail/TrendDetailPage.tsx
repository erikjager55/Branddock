'use client';

import { ArrowLeft, Zap, ZapOff, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/shared';
import { useTrendDetail, useActivateTrend, useDeleteTrend } from '../../hooks';
import { useTrendRadarStore } from '../../stores/useTrendRadarStore';
import { TrendRelevanceCard } from './TrendRelevanceCard';
import { TrendSourceInfoCard } from './TrendSourceInfoCard';
import { TrendActivationCard } from './TrendActivationCard';
import {
  CATEGORY_COLORS,
  IMPACT_COLORS,
  SCOPE_LABELS,
  TIMEFRAME_LABELS,
  DIRECTION_CONFIG,
} from '../../constants/trend-radar-constants';

interface TrendDetailPageProps {
  onNavigate: (section: string) => void;
}

export function TrendDetailPage({ onNavigate }: TrendDetailPageProps) {
  const { selectedTrendId } = useTrendRadarStore();
  const { data: trend, isLoading } = useTrendDetail(selectedTrendId);
  const activateMutation = useActivateTrend();
  const deleteMutation = useDeleteTrend();

  if (isLoading || !trend) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const categoryConfig = CATEGORY_COLORS[trend.category];
  const impactConfig = IMPACT_COLORS[trend.impactLevel];
  const directionConfig = trend.direction ? DIRECTION_CONFIG[trend.direction] : null;

  const handleDelete = async () => {
    if (!confirm('Delete this trend? This action cannot be undone.')) return;
    await deleteMutation.mutateAsync(trend.id);
    onNavigate('trends');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => onNavigate('trends')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Trend Radar
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{trend.title}</h1>
          {trend.description && (
            <p className="text-sm text-gray-600 mt-1 max-w-2xl">{trend.description}</p>
          )}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
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
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {trend.isActivated ? (
            <Button
              variant="secondary"
              size="sm"
              icon={ZapOff}
              onClick={() => activateMutation.mutate(trend.id)}
            >
              Deactivate
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={Zap}
              onClick={() => activateMutation.mutate(trend.id)}
            >
              Activate
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={handleDelete}
            isLoading={deleteMutation.isPending}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid md:grid-cols-12 gap-6">
        {/* Main content — 8 cols */}
        <div className="md:col-span-8 space-y-6">
          {/* Industries */}
          {trend.industries.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Industries</h3>
              <div className="flex flex-wrap gap-1.5">
                {trend.industries.map((ind) => (
                  <span key={ind} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {trend.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {trend.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* How to Use */}
          {trend.howToUse.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">How to Use This Trend</h3>
              <ul className="space-y-1.5">
                {trend.howToUse.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Analysis */}
          {trend.aiAnalysis && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">AI Analysis</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{trend.aiAnalysis}</p>
            </div>
          )}

          {/* Raw Excerpt */}
          {trend.rawExcerpt && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Source Excerpt</h3>
              <blockquote className="text-sm text-gray-600 italic border-l-2 border-gray-200 pl-3">
                {trend.rawExcerpt}
              </blockquote>
            </div>
          )}

          {/* Source URL */}
          {trend.sourceUrl && (
            <a
              href={trend.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View original source
            </a>
          )}
        </div>

        {/* Sidebar — 4 cols */}
        <div className="md:col-span-4 space-y-4">
          <TrendRelevanceCard score={trend.relevanceScore} confidence={trend.confidence} />
          <TrendSourceInfoCard trend={trend} />
          <TrendActivationCard trend={trend} onToggle={() => activateMutation.mutate(trend.id)} />
        </div>
      </div>
    </div>
  );
}
