import React from 'react';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { DecisionReadiness } from './DecisionReadiness';
import { DashboardStatsCards } from './DashboardStatsCards';
import { AttentionList } from './AttentionList';
import { RecommendedAction } from './RecommendedAction';
import { QuickAccess } from './QuickAccess';
import { ActiveCampaignsPreview } from './ActiveCampaignsPreview';
import { OnboardingWizard } from './OnboardingWizard';
import { QuickStartWidget } from './QuickStartWidget';

interface DashboardPageProps {
  onNavigate: (section: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  return (
    <div data-testid="dashboard">
      {/* Onboarding Wizard (modal overlay, renders only when needed) */}
      <OnboardingWizard />

      <PageShell>
        <PageHeader
          moduleKey="dashboard"
          title="Dashboard"
          subtitle="Your brand at a glance"
        />

        {/* Decision Readiness */}
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
            <RecommendedAction onNavigate={onNavigate} />
            <QuickAccess onNavigate={onNavigate} />
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-6">
            <ActiveCampaignsPreview onNavigate={onNavigate} />
            <QuickStartWidget onNavigate={onNavigate} />
          </div>
        </div>
      </PageShell>
    </div>
  );
}
