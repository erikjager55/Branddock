import React from 'react';
import {
  Package,
  Users,
  Layers,
  Megaphone,
  TrendingUp,
  Swords,
  AlertTriangle,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardStats, dashboardKeys } from '../../hooks/use-dashboard';
import { SkeletonCard } from '../shared';

interface StatsCardProps {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  bgColor: string;
  iconColor: string;
  onClick: () => void;
}

function StatsCard({ icon: Icon, value, label, bgColor, iconColor, onClick }: StatsCardProps) {
  return (
    <button
      onClick={onClick}
      data-testid="stat-card"
      className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${bgColor}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </button>
  );
}

interface DashboardStatsCardsProps {
  onNavigate: (section: string) => void;
}

export function DashboardStatsCards({ onNavigate }: DashboardStatsCardsProps) {
  const { data, isLoading, isError } = useDashboardStats();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-4">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to load stats</span>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: dashboardKeys.stats })}
          className="text-sm text-red-600 hover:text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      icon: Package,
      value: `${data.brandAssets.ready}/${data.brandAssets.total}`,
      label: 'Brand Assets',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      section: 'brand',
    },
    {
      icon: Users,
      value: data.personas,
      label: 'Personas',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      section: 'personas',
    },
    {
      icon: Layers,
      value: data.products,
      label: 'Products',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      section: 'products',
    },
    {
      icon: Megaphone,
      value: data.campaigns,
      label: 'Active Campaigns',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      section: 'active-campaigns',
    },
    {
      icon: TrendingUp,
      value: data.trends,
      label: 'Activated Trends',
      bgColor: 'bg-teal-50',
      iconColor: 'text-teal-600',
      section: 'trends',
    },
    {
      icon: Swords,
      value: data.competitors,
      label: 'Competitors',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      section: 'competitors',
    },
  ];

  return (
    <div data-testid="dashboard-stats" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <StatsCard
          key={card.label}
          icon={card.icon}
          value={card.value}
          label={card.label}
          bgColor={card.bgColor}
          iconColor={card.iconColor}
          onClick={() => onNavigate(card.section)}
        />
      ))}
    </div>
  );
}
