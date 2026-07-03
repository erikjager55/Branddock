'use client';

import { Compass, Lightbulb, Rocket, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PurposeLayer {
  key: 'why' | 'how' | 'impact';
  icon: typeof Compass;
  color: string;
  bgColor: string;
}

const LAYERS: PurposeLayer[] = [
  {
    key: 'why',
    icon: Compass,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    key: 'how',
    icon: Lightbulb,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    key: 'impact',
    icon: Rocket,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
];

export interface PurposeStatementData {
  why: string;
  how: string;
  impact: string;
}

interface PurposeStatementSectionProps {
  data: PurposeStatementData;
  isEditing: boolean;
  onUpdate: (data: PurposeStatementData) => void;
}

export function PurposeStatementSection({ data, isEditing, onUpdate }: PurposeStatementSectionProps) {
  const { t } = useTranslation('brand-asset-detail');
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Target className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">{t('purposeStatement.title')}</h3>
            <p className="text-sm text-gray-500">{t('purposeStatement.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Layers */}
      <div className="p-5 space-y-4">
        {LAYERS.map((layer) => {
          const Icon = layer.icon;
          const value = data[layer.key] || '';

          return (
            <div key={layer.key} className="flex items-start gap-3">
              <div className={`mt-1 h-8 w-8 rounded-lg ${layer.bgColor} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-4 w-4 ${layer.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 mb-0.5">{t(`purposeStatement.layers.${layer.key}.label`)}</h4>
                <p className="text-xs text-gray-400 mb-2">{t(`purposeStatement.layers.${layer.key}.description`)}</p>
                {isEditing ? (
                  <textarea
                    value={value}
                    onChange={(e) => onUpdate({ ...data, [layer.key]: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
                    rows={3}
                    placeholder={t('purposeStatement.editPlaceholder', { layer: t(`purposeStatement.layers.${layer.key}.label`).toLowerCase() })}
                  />
                ) : (
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {value || <span className="italic text-gray-400">{t('purposeStatement.notYetFilledIn')}</span>}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
