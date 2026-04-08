import React, { useMemo } from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
import * as LucideIcons from 'lucide-react';
import {
  PanelLeftOpen,
  PanelLeftClose,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { SIDEBAR_NAV } from '../lib/constants/design-tokens';
import { ResearchMethodType } from '../types/brand-asset';
import { preloadModule } from '../lib/lazy-imports';

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
  // All nav items flat for collapsed mode
  const allNavItems = useMemo(() => {
    return SIDEBAR_NAV.sections.flatMap(s => s.items);
  }, []);

  if (collapsed) {
    return (
      <div data-testid="sidebar" className="h-full bg-white border-r border-gray-200 w-16 flex-shrink-0 flex flex-col">
        {/* Logo - Collapsed */}
        <div className="p-3 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">B</span>
          </div>
        </div>

        <div className="p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="w-8 h-8 hover:bg-gray-100"
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
    <div data-testid="sidebar" className="h-full bg-white border-r border-gray-200 flex-shrink-0 flex flex-col w-[200px]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top Section - Logo & Create Button */}
      <div className="px-4 pt-5 pb-2">
        {/* Logo + Collapse */}
        <div className="flex items-center justify-between mb-5">
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
            className="h-7 w-7 hover:bg-gray-100 text-gray-400 flex-shrink-0"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

      </div>

      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-4 space-y-5">
        {SIDEBAR_NAV.sections.map((section) => (
          <div key={section.label} className="space-y-0.5">
            {section.label && (
              <div className="px-2 mb-1.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {section.label}
                </h3>
              </div>
            )}
            {section.items.map((item) => {
              const Icon = getIcon(item.icon);
              const isActive = activeSection === item.key || activeSection.startsWith(item.key + '-');

              return (
                <button
                  key={item.key}
                  data-section-id={item.key}
                  className={`w-full flex items-center gap-3 h-9 px-3 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-medium border-l-[3px] border-emerald-500 pl-[9px]'
                      : 'text-gray-600 hover:bg-gray-50 border-l-[3px] border-transparent pl-[9px]'
                  }`}
                  onClick={() => setActiveSection(item.key)}
                  onMouseEnter={() => preloadModule(item.key)}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Section - Fixed (compact, no accordion) */}
      <div className="flex-shrink-0 border-t border-gray-200 px-3 py-2 space-y-0.5">
        <button
          className={`w-full flex items-center gap-3 h-9 px-3 rounded-md text-sm transition-colors ${
            activeSection.startsWith('settings-')
              ? 'bg-emerald-50 text-emerald-700 font-medium border-l-[3px] border-emerald-500 pl-[9px]'
              : 'text-gray-600 hover:bg-gray-50 border-l-[3px] border-transparent pl-[9px]'
          }`}
          onClick={() => setActiveSection('settings-account')}
          onMouseEnter={() => preloadModule('settings-account')}
        >
          <Settings className={`h-4 w-4 flex-shrink-0 ${activeSection.startsWith('settings-') ? 'text-emerald-600' : 'text-gray-400'}`} />
          <span className="flex-1 text-left">Settings</span>
        </button>
        <button
          className={`w-full flex items-center gap-3 h-9 px-3 rounded-md text-sm transition-colors ${
            activeSection === 'help'
              ? 'bg-emerald-50 text-emerald-700 font-medium border-l-[3px] border-emerald-500 pl-[9px]'
              : 'text-gray-600 hover:bg-gray-50 border-l-[3px] border-transparent pl-[9px]'
          }`}
          onClick={() => setActiveSection('help')}
        >
          <HelpCircle className={`h-4 w-4 flex-shrink-0 ${activeSection === 'help' ? 'text-emerald-600' : 'text-gray-400'}`} />
          <span className="flex-1 text-left">Help & Support</span>
        </button>
      </div>
    </div>
  );
}
