import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Home,
  Palette,
  Users,
  Package,
  TrendingUp,
  BookOpen,
  Rocket,
  Target,
  ClipboardList,
  Sparkles,
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
  ChevronRight,
  Layers,
  Settings,
  HelpCircle,
  Paintbrush,
  Shield,
} from 'lucide-react';
import { mockBrandAssets } from '../data/mock-brand-assets';
import { ResearchMethodType } from '../types/brand-asset';

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

export function EnhancedSidebarSimple({
  activeSection,
  setActiveSection,
  collapsed,
  onToggleCollapse,
}: EnhancedSidebarSimpleProps) {
  // Navigation groups
  const workspaceItems: NavigationItem[] = [
    { id: 'dashboard', label: 'Overview', icon: Home },
  ];

  const knowledgeItems: NavigationItem[] = [
    { id: 'brand', label: 'Brand Foundation', icon: Layers },
    { id: 'business-strategy', label: 'Business Strategy', icon: Target },
    { id: 'brandstyle', label: 'Brandstyle', icon: Paintbrush },
    { id: 'personas', label: 'Personas', icon: Users },
    { id: 'products', label: 'Products & Services', icon: Package },
    { id: 'trends', label: 'Market Insights', icon: TrendingUp },
    { id: 'knowledge', label: 'Knowledge Library', icon: BookOpen },
    { id: 'brand-alignment', label: 'Brand Alignment', icon: Shield },
  ];

  const strategyItems: NavigationItem[] = [
    { id: 'new-strategy', label: 'New Strategy', icon: Rocket },
    { id: 'active-campaigns', label: 'Active Campaigns', icon: Target },
  ];

  const validationItems: NavigationItem[] = [
    { id: 'research', label: 'Research Hub', icon: Target },
    { id: 'research-bundles', label: 'Research Bundles', icon: ClipboardList },
    { id: 'custom-validation', label: 'Custom Validation', icon: Sparkles },
  ];

  const settingsItems: NavigationItem[] = [
    { id: 'settings-account', label: 'Account', icon: User },
    { id: 'settings-team', label: 'Team', icon: Users },
    { id: 'settings-agency', label: 'Agency', icon: Building2 },
    { id: 'settings-clients', label: 'Clients', icon: Network },
    { id: 'settings-billing', label: 'Billing & Payments', icon: CreditCard },
    { id: 'settings-notifications', label: 'Notifications', icon: Bell },
    { id: 'settings-appearance', label: 'Appearance', icon: Globe },
    { id: 'settings-commercial-demo', label: 'Commercial Demo', icon: ShoppingCart },
    { id: 'validation-demo', label: '🎨 Demo: Compact Variant', icon: Sparkles, badge: 'NEW' },
  ];

  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  // Count assets that need attention
  const needsAttentionCount = useMemo(() => {
    return mockBrandAssets.filter(asset => asset.status === 'ready-to-validate').length;
  }, []);

  if (collapsed) {
    return (
      <div className="h-screen bg-white border-r border-border w-16 flex-shrink-0 flex flex-col shadow-sm">
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
          {[...workspaceItems, ...knowledgeItems, ...strategyItems, ...validationItems].map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id || activeSection.startsWith(item.id + '-');

            return (
              <Button
                key={item.id}
                variant="ghost"
                size="icon"
                className={`w-full h-10 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setActiveSection(item.id)}
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
    <div className="h-screen bg-[#F8F9FA] border-r border-gray-200 flex-shrink-0 flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif', width: '208px' }}>
      {/* Top Section - Logo & Collapse Button */}
      <div className="px-4 pt-6 pb-4 border-b border-gray-200">
        {/* Logo/Brand */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-white font-bold text-base">B</span>
            </div>
            <span className="text-base font-semibold text-foreground">Branddock</span>
          </div>
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

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-6">
        {/* WORKSPACE Section */}
        <div className="space-y-1">
          <div className="px-2 mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Workspace
            </h3>
          </div>
          {workspaceItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id || activeSection.startsWith(item.id + '-');
            const showBadge = item.id === 'risks-priorities' && needsAttentionCount > 0;

            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start gap-3 h-9 px-3 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setActiveSection(item.id)}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className="flex-1 text-left text-sm">{item.label}</span>
                {showBadge && (
                  <Badge variant="secondary" className="bg-gray-300 text-gray-900 text-xs h-5 px-1.5">
                    {needsAttentionCount}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>

        {/* STRATEGY Section */}
        <div className="space-y-1">
          <div className="px-2 mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Strategy
            </h3>
          </div>
          {strategyItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id || activeSection.startsWith(item.id + '-');

            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start gap-3 h-9 px-3 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setActiveSection(item.id)}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className="flex-1 text-left text-sm">{item.label}</span>
              </Button>
            );
          })}
        </div>

        {/* KNOWLEDGE Section */}
        <div className="space-y-1">
          <div className="px-2 mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Knowledge
            </h3>
          </div>
          {knowledgeItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id || activeSection.startsWith(item.id + '-');
            const showBadge = item.id === 'brand' && needsAttentionCount > 0;

            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start gap-3 h-9 px-3 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setActiveSection(item.id)}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className="flex-1 text-left text-sm">{item.label}</span>
                {showBadge && (
                  <Badge variant="secondary" className="bg-gray-300 text-gray-900 text-xs h-5 px-1.5">
                    {needsAttentionCount}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>

        {/* VALIDATION Section */}
        <div className="space-y-1">
          <div className="px-2 mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Validation
            </h3>
          </div>
          {validationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id || activeSection.startsWith(item.id + '-');

            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start gap-3 h-9 px-3 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setActiveSection(item.id)}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className="flex-1 text-left text-sm">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Footer - Settings & Help */}
      <div className="border-t border-gray-200 p-3 pb-6 space-y-1">
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
                  className={`w-full justify-start gap-3 h-8 px-3 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveSection(item.id)}
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
          className="w-full justify-start gap-3 h-9 px-3 text-gray-700 hover:bg-gray-50"
          onClick={() => console.log('Help & support')}
        >
          <HelpCircle className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <span className="flex-1 text-left text-sm">Help & Support</span>
        </Button>
      </div>
    </div>
  );
}