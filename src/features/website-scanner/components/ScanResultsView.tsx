'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Users, Package, Swords, Lightbulb, TrendingUp } from 'lucide-react';
import { useWebsiteScannerStore } from '../stores/useWebsiteScannerStore';
import { useScanProgress } from '../hooks';
import { CategoryResultCard } from './CategoryResultCard';

interface ScanResultsViewProps {
  onNavigate: (section: string) => void;
}

export function ScanResultsView({ onNavigate }: ScanResultsViewProps) {
  const { t } = useTranslation('website-scanner');
  const { jobId, openApplyModal } = useWebsiteScannerStore();
  const { data: progress } = useScanProgress(jobId);
  const results = progress?.results;

  if (!results) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('results.none')}
      </div>
    );
  }

  const categories = [
    {
      id: 'brandAssets',
      title: t('categories.brandAssets'),
      icon: Shield,
      color: 'teal',
      items: results.brandAssets,
      count: results.brandAssets.length,
      description: t('categoryDescription.brandAssets', { count: results.brandAssets.length }),
    },
    {
      id: 'personas',
      title: t('categories.personas'),
      icon: Users,
      color: 'blue',
      items: results.personas,
      count: results.personas.length,
      description: t('categoryDescription.personas', { count: results.personas.length }),
    },
    {
      id: 'products',
      title: t('categories.products'),
      icon: Package,
      color: 'purple',
      items: results.products,
      count: results.products.length,
      description: t('categoryDescription.products', { count: results.products.length }),
    },
    {
      id: 'competitors',
      title: t('categories.competitors'),
      icon: Swords,
      color: 'amber',
      items: results.competitors,
      count: results.competitors.length,
      description: t('categoryDescription.competitors', { count: results.competitors.length }),
    },
  ];

  const totalItems = categories.reduce((sum, c) => sum + c.count, 0);
  const avgConfidence = totalItems > 0
    ? Math.round(
        [...results.brandAssets, ...results.personas, ...results.products, ...results.competitors]
          .reduce((sum, item) => sum + item.confidence, 0) / totalItems
      )
    : 0;

  return (
    <div>
      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('results.complete')}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('results.summary', {
                items: totalItems,
                categories: categories.filter(c => c.count > 0).length,
                confidence: avgConfidence,
              })}
            </p>
          </div>
          <button
            onClick={openApplyModal}
            className="px-6 py-2.5 text-white text-sm font-medium rounded-lg"
            style={{ backgroundColor: '#0D9488' }}
          >
            {t('results.applyAll')}
          </button>
        </div>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <CategoryResultCard
            key={cat.id}
            title={cat.title}
            icon={cat.icon}
            color={cat.color}
            items={cat.items}
            description={cat.description}
          />
        ))}
      </div>

      {/* Strategy hints and trend signals */}
      {(results.strategyHints.objectives.length > 0 || results.trendSignals.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {results.strategyHints.objectives.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900">{t('results.strategyHints')}</h3>
              </div>
              <ul className="space-y-1.5">
                {results.strategyHints.objectives.map((obj, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {results.trendSignals.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-900">{t('results.trendSignals')}</h3>
              </div>
              <ul className="space-y-1.5">
                {results.trendSignals.map((trend, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span><strong>{trend.title}</strong>: {trend.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
