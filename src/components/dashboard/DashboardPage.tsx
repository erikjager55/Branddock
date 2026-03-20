import React from 'react';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { useSession } from '@/lib/auth-client';
import { DecisionReadiness } from './DecisionReadiness';
import { DashboardStatsCards } from './DashboardStatsCards';
import { AttentionList } from './AttentionList';
import { NextActions } from './NextActions';
import { ActiveCampaignsPreview } from './ActiveCampaignsPreview';
import { RecentActivity } from './RecentActivity';
import { OnboardingWizard } from './OnboardingWizard';
import { QuickStartWidget } from './QuickStartWidget';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface DashboardPageProps {
  onNavigate: (section: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(' ')[0] || '';

  return (
    <div data-testid="dashboard">
      <OnboardingWizard onNavigate={onNavigate} />

      <PageShell>
        <PageHeader
          moduleKey="dashboard"
          title="Dashboard"
          subtitle="Your brand at a glance"
        />

        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{getFormattedDate()}</p>
        </div>

        {/* Decision Readiness (hero card) */}
        <div className="mb-6">
          <DecisionReadiness />
        </div>

        {/* Stats Cards */}
        <div className="mb-6">
          <DashboardStatsCards onNavigate={onNavigate} />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <AttentionList onNavigate={onNavigate} />
            <NextActions onNavigate={onNavigate} />
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-6">
            <ActiveCampaignsPreview onNavigate={onNavigate} />
            <RecentActivity />
            <QuickStartWidget onNavigate={onNavigate} />
          </div>
        </div>
      </PageShell>
    </div>
  );
}
