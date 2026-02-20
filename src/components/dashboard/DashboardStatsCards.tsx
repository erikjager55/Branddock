import React from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Megaphone,
  FileText,
} from 'lucide-react';
import { useDashboardStats } from '../../hooks/use-dashboard';
import { SkeletonCard } from '../shared';

interface StatsCardProps {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
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
  const { data, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    { icon: CheckCircle, value: data.readyToUse, label: 'Ready to use', bgColor: 'bg-green-50', iconColor: 'text-green-600', section: 'brand' },
    { icon: AlertTriangle, value: data.needAttention, label: 'Need attention', bgColor: 'bg-yellow-50', iconColor: 'text-yellow-600', section: 'brand' },
    { icon: Clock, value: data.inProgress, label: 'In progress', bgColor: 'bg-blue-50', iconColor: 'text-blue-600', section: 'brand' },
    { icon: Megaphone, value: data.activeCampaigns, label: 'Active campaigns', bgColor: 'bg-purple-50', iconColor: 'text-purple-600', section: 'active-campaigns' },
    { icon: FileText, value: data.contentCreated, label: 'Content created', bgColor: 'bg-orange-50', iconColor: 'text-orange-600', section: 'content-library' },
  ];

  return (
    <div data-testid="dashboard-stats" className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
