import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import * as LucideIcons from 'lucide-react';
import {
  User,
  Building2,
  Network,
  CreditCard,
  Bell,
  Globe,
  ShoppingCart,
  PanelLeftOpen,
  PanelLeftClose,
  ChevronDown,
  Sparkles,
  Settings,
  HelpCircle,
  Users,
} from 'lucide-react';
import { useBrandAssets } from '../contexts/BrandAssetsContext';
import { useBrandAlignment } from '../contexts/BrandAlignmentContext';
import { SIDEBAR_NAV } from '../lib/constants/design-tokens';
import { ResearchMethodType } from '../types/brand-asset';
import { PlanBadge, UsageMeter } from './billing';
import { useBillingPlan } from '../hooks/use-billing';
import { preloadModule } from '../lib/lazy-imports';

type NavigationItem = {
  id: string;
  label: string;
  icon: any;
  badge?: string;
};

interface EnhancedSidebarSimpleProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  onAssetClick?: (assetId: string) => void;
  onMethodClick?: (assetId: string, methodType: ResearchMethodType) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function getIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || LucideIcons.Circle;
}

export function EnhancedSidebarSimple({
  activeSection,
  setActiveSection,
  collapsed,
  onToggleCollapse,
}: EnhancedSidebarSimpleProps) {
  const { brandAssets } = useBrandAssets();
  const { overview: alignmentOverview } = useBrandAlignment();
  const openIssuesCount = alignmentOverview?.openIssuesCount ?? 0;
  const billing = useBillingPlan();

  const settingsItems: NavigationItem[] = [
    { id: 'settings-account', label: 'Account', icon: User },
    { id: 'settings-team', label: 'Team', icon: Users },
    { id: 'settings-agency', label: 'Agency', icon: Building2 },
    { id: 'settings-clients', label: 'Clients', icon: Network },
    { id: 'settings-billing', label: 'Billing & Payments', icon: CreditCard },
    { id: 'settings-notifications', label: 'Notifications', icon: Bell },
    { id: 'settings-appearance', label: 'Appearance', icon: Globe },
    { id: 'settings-commercial-demo', label: 'Commercial Demo', icon: ShoppingCart },
    { id: 'validation-demo', label: 'Demo: Compact Variant', icon: Sparkles, badge: 'NEW' },
  ];

  const [settingsExpanded, setSettingsExpanded] = useState(true);

  // Count assets that need attention
  const needsAttentionCount = useMemo(() => {
    return brandAssets.filter(asset => asset.status === 'ready-to-validate').length;
  }, [brandAssets]);

  // All nav items flat for collapsed mode
  const allNavItems = useMemo(() => {
    return SIDEBAR_NAV.sections.flatMap(s => s.items);
  }, []);

  if (collapsed) {
    return (
      <div data-testid="sidebar" className="h-screen bg-white border-r border-border w-16 flex-shrink-0 flex flex-col shadow-sm">
        {/* Logo - Collapsed */}
        <div className="p-3 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">B</span>
          </div>
        </div>

        <div className="p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="w-8 h-8 hover:bg-muted"
          >
            <PanelLeftOpen className="h-4 w-4 text-gray-400" />
          </Button>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {allNavItems.map((item) => {
            const Icon = getIcon(item.icon);
            const isActive = activeSection === item.key || activeSection.startsWith(item.key + '-');

            return (
              <Button
                key={item.key}
                variant="ghost"
                size="icon"
                data-section-id={item.key}
                className={`w-full h-10 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setActiveSection(item.key)}
                onMouseEnter={() => preloadModule(item.key)}
                title={item.label}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
              </Button>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div data-testid="sidebar" className="h-screen bg-gray-50 border-r border-gray-200 flex-shrink-0 flex flex-col w-[180px]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top Section - Logo & Collapse Button */}
      <div className="px-4 pt-6 pb-4 border-b border-gray-200">
        {/* Logo/Brand */}
        <div className="flex items-center justify-between mb-4">
          <Image
            src="/Logo_Branddock_RGB.png"
            alt="Branddock"
            width={130}
            height={23}
            priority
            className="flex-shrink-0"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 hover:bg-gray-200 text-gray-600 flex-shrink-0"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Navigation + Settings + Help (all scrollable) */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-6">
        {SIDEBAR_NAV.sections.map((section) => (
          <div key={section.label} className="space-y-1">
            {section.label && (
              <div className="px-2 mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {section.label}
                </h3>
              </div>
            )}
            {section.items.map((item) => {
              const Icon = getIcon(item.icon);
              const isActive = activeSection === item.key || activeSection.startsWith(item.key + '-');
              const showBrandBadge = item.key === 'brand' && needsAttentionCount > 0;
              const showAlignmentBadge = item.key === 'brand-alignment' && openIssuesCount > 0;

              return (
                <Button
                  key={item.key}
                  variant="ghost"
                  data-section-id={item.key}
                  className={`w-full justify-start gap-3 h-9 px-3 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveSection(item.key)}
                  onMouseEnter={() => preloadModule(item.key)}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span className="flex-1 text-left text-sm">{item.label}</span>
                  {showBrandBadge && (
                    <Badge variant="secondary" className="bg-gray-300 text-gray-900 text-xs h-5 px-1.5">
                      {needsAttentionCount}
                    </Badge>
                  )}
                  {showAlignmentBadge && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {openIssuesCount}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        ))}

        {/* Settings & Help — inside scrollable area */}
        <div className="border-t border-gray-200 pt-3 space-y-1">
          <Button
            variant="ghost"
            className={`w-full justify-between h-9 px-3 ${
              activeSection.startsWith('settings-')
                ? 'bg-emerald-50 text-emerald-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setSettingsExpanded(!settingsExpanded)}
          >
            <div className="flex items-center gap-3">
              <Settings className={`h-4 w-4 flex-shrink-0 ${activeSection.startsWith('settings-') ? 'text-emerald-600' : 'text-gray-400'}`} />
              <span className="text-sm">Settings</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${settingsExpanded ? 'rotate-180' : ''}`} />
          </Button>

          {settingsExpanded && (
            <div className="pl-7 space-y-1">
              {settingsItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id || activeSection.startsWith(item.id + '-');

                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    data-section-id={item.id}
                    className={`w-full justify-start gap-3 h-8 px-3 ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setActiveSection(item.id)}
                    onMouseEnter={() => preloadModule(item.id)}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span className="flex-1 text-left text-sm">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="bg-gray-300 text-gray-900 text-xs h-5 px-1.5">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          )}

          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 h-9 px-3 ${
              activeSection === 'help'
                ? 'bg-emerald-50 text-emerald-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveSection('help')}
          >
            <HelpCircle className={`h-4 w-4 flex-shrink-0 ${activeSection === 'help' ? 'text-emerald-600' : 'text-gray-400'}`} />
            <span className="flex-1 text-left text-sm">Help & Support</span>
          </Button>
        </div>

        {/* Plan Badge + Usage Meter */}
        <div className="border-t border-gray-200 pt-3 pb-4 px-1 space-y-2">
          <div className="flex items-center justify-center">
            <PlanBadge tier={billing.plan.tier} isFreeBeta={billing.isFreeBeta} />
          </div>
          {!billing.isFreeBeta && billing.usage.percentage > 50 && (
            <UsageMeter
              used={billing.usage.aiTokens}
              limit={billing.usage.aiTokensLimit}
              compact
            />
          )}
        </div>
      </nav>
    </div>
  );
}
