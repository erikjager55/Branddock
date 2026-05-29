'use client';

import { User, Users, Briefcase, CreditCard, Bell, Palette, Shield, Brain, Plug, Bug, Lightbulb, MessageSquarePlus, FileText, FileCode, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSettingsStore, type SettingsTab } from '@/stores/useSettingsStore';
import { useDeveloperAccess } from '@/hooks/use-developer-access';
import { useChatFeedbackTriage } from '@/hooks/use-chat-feedback';

interface NavItem {
  id: SettingsTab;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'workspaces', label: 'Workspaces', icon: Briefcase },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'brand-rules', label: 'Brand Rules', icon: FileText },
  { id: 'validation', label: 'Validation', icon: ShieldCheck },
];

export function SettingsSubNav() {
  const activeTab = useSettingsStore((s) => s.activeTab);
  const setActiveTab = useSettingsStore((s) => s.setActiveTab);
  const { data: isDeveloper } = useDeveloperAccess();
  const { data: feedbackList } = useChatFeedbackTriage(isDeveloper === true);
  const newFeedbackCount = (feedbackList ?? []).filter((f) => f.status === 'new').length;

  return (
    <div data-testid="settings-subnav" className="w-[200px] flex-shrink-0 border-r border-gray-200 p-4 space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            data-testid={`settings-tab-${item.id}`}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </button>
        );
      })}

      {/* Developer-only section */}
      {isDeveloper === true && (
        <div className="pt-4 mt-4 border-t border-gray-200">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Developer
          </p>
          <button
            data-testid="settings-tab-ai-models"
            onClick={() => setActiveTab('ai-models')}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'ai-models'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Brain className="w-4 h-4" />
            AI Models
          </button>
          <button
            data-testid="settings-tab-administrator"
            onClick={() => setActiveTab('administrator')}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'administrator'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            AI Configuration
          </button>
          <button
            data-testid="settings-tab-ai-prompts"
            onClick={() => setActiveTab('ai-prompts')}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'ai-prompts'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <FileCode className="w-4 h-4" />
            AI Prompts
          </button>
          <button
            data-testid="settings-tab-visual-fidelity"
            onClick={() => setActiveTab('visual-fidelity')}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'visual-fidelity'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Visual Fidelity
          </button>
          <button
            data-testid="settings-tab-bug-triage"
            onClick={() => setActiveTab('bug-triage')}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'bug-triage'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Bug className="w-4 h-4" />
            Bug Triage
          </button>
          <button
            data-testid="settings-tab-feature-triage"
            onClick={() => setActiveTab('feature-triage')}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'feature-triage'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            Feature Triage
          </button>
          <button
            data-testid="settings-tab-feedback-triage"
            onClick={() => setActiveTab('feedback-triage')}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'feedback-triage'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span className="flex-1 text-left">Feedback</span>
            {newFeedbackCount > 0 && (
              <span
                className="min-w-[18px] h-[18px] px-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center text-white"
                style={{ backgroundColor: '#7c3aed' }}
                aria-label={`${newFeedbackCount} new feedback ${newFeedbackCount === 1 ? 'entry' : 'entries'}`}
              >
                {newFeedbackCount > 99 ? '99+' : newFeedbackCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
