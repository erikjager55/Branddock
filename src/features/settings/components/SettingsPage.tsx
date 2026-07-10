'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, type SettingsTab } from '@/stores/useSettingsStore';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { SettingsSubNav } from './SettingsSubNav';
import { AccountTab } from './account/AccountTab';
import { TeamTab } from './team/TeamTab';
import { WorkspacesTab } from './workspaces/WorkspacesTab';
import { AppearanceTab } from './appearance/AppearanceTab';
import { BillingTab } from './billing/BillingTab';
import { IntegrationsTab } from './integrations/IntegrationsTab';
import { RulesTab } from './brand-voice/RulesTab';
import { ValidationTab } from './validation/ValidationTab';
import { AdministratorTab } from './administrator/AdministratorTab';
import { AiModelsTab } from './ai-models/AiModelsTab';
import { AuthorProfileTab } from './author-profile/AuthorProfileTab';
import { PromptRegistryTab } from './prompt-registry/PromptRegistryTab';
import { VisualFidelityDashboardTab } from './visual-fidelity/VisualFidelityDashboardTab';
import { BugTriageTab } from './developer/BugTriageTab';
import { FeatureTriageTab } from './developer/FeatureTriageTab';
import { FeedbackTriageTab } from './developer/FeedbackTriageTab';
import { CreditAdminPanel } from './developer/CreditAdminPanel';
import { useDeveloperAccess } from '@/hooks/use-developer-access';

const DEVELOPER_TABS: SettingsTab[] = ['administrator', 'ai-models', 'ai-prompts', 'author-profile', 'visual-fidelity', 'bug-triage', 'feature-triage', 'feedback-triage', 'credit-admin'];

interface SettingsPageProps {
  initialTab?: SettingsTab;
}

export function SettingsPage({ initialTab }: SettingsPageProps) {
  const { t } = useTranslation('settings-misc');
  const activeTab = useSettingsStore((s) => s.activeTab);
  const setActiveTab = useSettingsStore((s) => s.setActiveTab);
  const { data: isDeveloper } = useDeveloperAccess();

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Redirect non-developers away from developer tabs and sync store
  const shouldRedirect =
    isDeveloper !== true && DEVELOPER_TABS.includes(activeTab);

  useEffect(() => {
    if (shouldRedirect) {
      setActiveTab('account');
    }
  }, [shouldRedirect, setActiveTab]);

  const effectiveTab = shouldRedirect ? 'account' : activeTab;

  function renderTabContent() {
    switch (effectiveTab) {
      case 'account':
        return <AccountTab />;
      case 'team':
        return <TeamTab />;
      case 'workspaces':
        return <WorkspacesTab />;
      case 'billing':
        return <BillingTab />;
      case 'notifications':
        return (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            {t('notifications.comingSoon')}
          </div>
        );
      case 'appearance':
        return <AppearanceTab />;
      case 'integrations':
        return <IntegrationsTab />;
      case 'brand-rules':
        return <RulesTab />;
      case 'validation':
        return <ValidationTab />;
      case 'administrator':
        return <AdministratorTab />;
      case 'ai-models':
        return <AiModelsTab />;
      case 'ai-prompts':
        return <PromptRegistryTab />;
      case 'author-profile':
        return <AuthorProfileTab />;
      case 'visual-fidelity':
        return <VisualFidelityDashboardTab />;
      case 'bug-triage':
        return <BugTriageTab />;
      case 'feature-triage':
        return <FeatureTriageTab />;
      case 'feedback-triage':
        return <FeedbackTriageTab />;
      case 'credit-admin':
        return <CreditAdminPanel />;
      default:
        return <AccountTab />;
    }
  }

  return (
    <PageShell noPadding>
      <PageHeader
        moduleKey="settings"
        title={t('page.title')}
        subtitle={t('page.subtitle')}
      />
      <div data-testid="settings-page" className="flex h-full">
        <SettingsSubNav />
        <div data-testid="settings-content" className="flex-1 overflow-y-auto">
          {renderTabContent()}
        </div>
      </div>
    </PageShell>
  );
}
