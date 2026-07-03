'use client';

import { useTranslation } from 'react-i18next';
import {
  Users,
  Brain,
  Target,
  Package,
  BookOpen,
  Megaphone,
  Building2,
  HardDrive,
} from 'lucide-react';
import { Card, Badge, ProgressBar } from '@/components/shared';
import { useBillingPlan } from '@/hooks/use-billing';
import { useUsage } from '@/hooks/use-settings';
import { formatLimit } from '@/lib/constants/plan-limits';
import type { FeatureKey } from '@/types/billing';

interface UsageRow {
  key: FeatureKey;
  label: string;
  icon: React.ElementType;
  used: number;
  limit: number;
  unit?: string;
}

function getColor(pct: number): 'teal' | 'amber' | 'red' {
  if (pct > 80) return 'red';
  if (pct >= 50) return 'amber';
  return 'teal';
}

function getBadgeVariant(pct: number): 'success' | 'warning' | 'danger' {
  if (pct > 80) return 'danger';
  if (pct >= 50) return 'warning';
  return 'success';
}

export function UsageOverviewCard() {
  const { t } = useTranslation('settings-billing');
  const billing = useBillingPlan();
  const { data: usageData, isLoading: usageLoading } = useUsage();
  const usage = usageData?.usage;

  if (billing.isFreeBeta) {
    return (
      <Card padding="lg">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('usage.title')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t('usage.labels.aiTokens'), icon: Brain, value: t('common.unlimited') },
            { label: t('usage.labels.teamMembers'), icon: Users, value: t('common.unlimited') },
            { label: t('usage.labels.campaigns'), icon: Megaphone, value: t('common.unlimited') },
            { label: t('usage.labels.storage'), icon: HardDrive, value: t('common.unlimited') },
          ].map((item) => (
            <div key={item.label} className="text-center p-3 bg-gray-50 rounded-lg">
              <item.icon className="h-5 w-5 text-gray-400 mx-auto mb-1.5" />
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-sm font-semibold text-primary">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const rows: UsageRow[] = [
    {
      key: 'TEAM_MEMBERS',
      label: t('usage.labels.teamMembers'),
      icon: Users,
      used: usage?.seats?.used ?? 0,
      limit: billing.limits.TEAM_MEMBERS,
    },
    {
      key: 'AI_TOKENS',
      label: t('usage.labels.aiTokens'),
      icon: Brain,
      used: billing.usage.aiTokens,
      limit: billing.usage.aiTokensLimit,
    },
    {
      key: 'PERSONAS',
      label: t('usage.labels.personas'),
      icon: Target,
      used: 0, // Would need persona count from context
      limit: billing.limits.PERSONAS,
    },
    {
      key: 'CAMPAIGNS',
      label: t('usage.labels.campaigns'),
      icon: Megaphone,
      used: 0,
      limit: billing.limits.CAMPAIGNS,
    },
    {
      key: 'BRAND_ASSETS',
      label: t('usage.labels.brandAssets'),
      icon: Building2,
      used: 0,
      limit: billing.limits.BRAND_ASSETS,
    },
    {
      key: 'PRODUCTS',
      label: t('usage.labels.products'),
      icon: Package,
      used: 0,
      limit: billing.limits.PRODUCTS,
    },
    {
      key: 'KNOWLEDGE_RESOURCES',
      label: t('usage.labels.knowledge'),
      icon: BookOpen,
      used: 0,
      limit: billing.limits.KNOWLEDGE_RESOURCES,
    },
    {
      key: 'STORAGE_MB',
      label: t('usage.labels.storage'),
      icon: HardDrive,
      used: usage?.storage?.usedGb ? Math.round(usage.storage.usedGb * 1024) : 0,
      limit: billing.limits.STORAGE_MB,
      unit: 'MB',
    },
  ];

  return (
    <Card padding="lg">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('usage.title')}</h3>
      {usageLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-2 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const pct = row.limit > 0 && isFinite(row.limit)
              ? Math.min(100, Math.round((row.used / row.limit) * 100))
              : 0;
            const Icon = row.icon;
            const isUnlimited = !isFinite(row.limit);

            return (
              <div key={row.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-sm text-gray-700">{row.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 tabular-nums">
                      {row.unit ? `${row.used}${row.unit}` : formatLimit(row.used)}
                      {' / '}
                      {isUnlimited ? t('common.unlimited') : row.unit ? `${row.limit}${row.unit}` : formatLimit(row.limit)}
                    </span>
                    {!isUnlimited && pct > 0 && (
                      <Badge variant={getBadgeVariant(pct)} size="sm">
                        {pct}%
                      </Badge>
                    )}
                  </div>
                </div>
                {!isUnlimited && (
                  <ProgressBar value={pct} color={getColor(pct)} size="sm" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
