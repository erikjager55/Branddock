'use client';

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
  const billing = useBillingPlan();
  const { data: usageData, isLoading: usageLoading } = useUsage();
  const usage = usageData?.usage;

  if (billing.isFreeBeta) {
    return (
      <Card padding="lg">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Usage Overview</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'AI Tokens', icon: Brain, value: 'Unlimited' },
            { label: 'Team Members', icon: Users, value: 'Unlimited' },
            { label: 'Campaigns', icon: Megaphone, value: 'Unlimited' },
            { label: 'Storage', icon: HardDrive, value: 'Unlimited' },
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
      label: 'Team Members',
      icon: Users,
      used: usage?.seats?.used ?? 0,
      limit: billing.limits.TEAM_MEMBERS,
    },
    {
      key: 'AI_TOKENS',
      label: 'AI Tokens',
      icon: Brain,
      used: billing.usage.aiTokens,
      limit: billing.usage.aiTokensLimit,
    },
    {
      key: 'PERSONAS',
      label: 'Personas',
      icon: Target,
      used: 0, // Would need persona count from context
      limit: billing.limits.PERSONAS,
    },
    {
      key: 'CAMPAIGNS',
      label: 'Campaigns',
      icon: Megaphone,
      used: 0,
      limit: billing.limits.CAMPAIGNS,
    },
    {
      key: 'BRAND_ASSETS',
      label: 'Brand Assets',
      icon: Building2,
      used: 0,
      limit: billing.limits.BRAND_ASSETS,
    },
    {
      key: 'PRODUCTS',
      label: 'Products',
      icon: Package,
      used: 0,
      limit: billing.limits.PRODUCTS,
    },
    {
      key: 'KNOWLEDGE_RESOURCES',
      label: 'Knowledge',
      icon: BookOpen,
      used: 0,
      limit: billing.limits.KNOWLEDGE_RESOURCES,
    },
    {
      key: 'STORAGE_MB',
      label: 'Storage',
      icon: HardDrive,
      used: usage?.storage?.usedGb ? Math.round(usage.storage.usedGb * 1024) : 0,
      limit: billing.limits.STORAGE_MB,
      unit: 'MB',
    },
  ];

  return (
    <Card padding="lg">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Usage Overview</h3>
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
                      {isUnlimited ? 'Unlimited' : row.unit ? `${row.limit}${row.unit}` : formatLimit(row.limit)}
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
