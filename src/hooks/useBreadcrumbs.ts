import { useBrandAssets } from '../contexts/BrandAssetsContext';
import { usePersonas } from '../contexts/PersonasContext';
/**
 * CUSTOM HOOK: useBreadcrumbs
 * 
 * Generates breadcrumbs based on current route/section.
 */

import { useMemo } from 'react';
import { BreadcrumbItem } from '../types/workflow';

export function useBreadcrumbs(
  activeSection: string,
  selectedAssetId?: string,
  selectedPersonaId?: string
): BreadcrumbItem[] {
  const { brandAssets } = useBrandAssets();
  const { personas } = usePersonas();
  return useMemo(() => {
    const breadcrumbs: BreadcrumbItem[] = [];

    // Dashboard is always home (handled by BreadcrumbNavigation component)
    
    // Brand Assets section
    if (activeSection === 'brand') {
      breadcrumbs.push({
        id: 'brand',
        label: 'Brand Assets',
        icon: 'Palette',
        isActive: true
      });
    }
    
    // Specific Brand Asset
    else if (activeSection.startsWith('brand-') && selectedAssetId) {
      const asset = brandAssets.find(a => a.id === selectedAssetId);
      
      breadcrumbs.push({
        id: 'brand',
        label: 'Brand Assets',
        icon: 'Palette',
        route: 'brand'
      });
      
      if (asset) {
        breadcrumbs.push({
          id: `brand-${selectedAssetId}`,
          label: asset.title,
          isActive: true
        });
      }
    }
    
    // Research Hub
    else if (activeSection === 'research' || activeSection === 'research-hub') {
      breadcrumbs.push({
        id: 'research',
        label: 'Research Hub',
        icon: 'FlaskConical',
        isActive: true
      });
    }
    
    // Personas
    else if (activeSection === 'personas') {
      breadcrumbs.push({
        id: 'personas',
        label: 'Personas',
        icon: 'Users',
        isActive: true
      });
    }
    
    // Specific Persona
    else if (activeSection.startsWith('persona-') && selectedPersonaId) {
      const persona = personas.find(p => p.id === selectedPersonaId);
      
      breadcrumbs.push({
        id: 'personas',
        label: 'Personas',
        icon: 'Users',
        route: 'personas'
      });
      
      if (persona) {
        breadcrumbs.push({
          id: `persona-${selectedPersonaId}`,
          label: persona.name,
          isActive: true
        });
      }
    }
    
    // Strategy & Goals
    else if (activeSection === 'strategy') {
      breadcrumbs.push({
        id: 'strategy',
        label: 'Strategy & Goals',
        icon: 'Zap',
        isActive: true
      });
    }
    
    // Products & Services
    else if (activeSection === 'products') {
      breadcrumbs.push({
        id: 'products',
        label: 'Products & Services',
        icon: 'Package',
        isActive: true
      });
    }
    
    // Trends
    else if (activeSection === 'trends') {
      breadcrumbs.push({
        id: 'trends',
        label: 'Trend Library',
        icon: 'TrendingUp',
        isActive: true
      });
    }
    
    // Knowledge Library
    else if (activeSection === 'knowledge') {
      breadcrumbs.push({
        id: 'knowledge',
        label: 'Knowledge Library',
        icon: 'BookOpen',
        isActive: true
      });
    }
    
    // Relationships
    else if (activeSection === 'relationships') {
      breadcrumbs.push({
        id: 'relationships',
        label: 'Relationships',
        icon: 'Network',
        isActive: true
      });
    }

    // Research Plans
    else if (activeSection === 'research-plans') {
      breadcrumbs.push({
        id: 'research',
        label: 'Research Hub',
        icon: 'FlaskConical',
        route: 'research'
      });
      breadcrumbs.push({
        id: 'research-plans',
        label: 'Research Plans',
        isActive: true
      });
    }

    // Brandstyle
    else if (activeSection === 'brandstyle' || activeSection === 'brandstyle-guide') {
      breadcrumbs.push({
        id: 'brandstyle',
        label: 'Brandstyle',
        icon: 'Paintbrush',
        isActive: true
      });
    }

    // Business Strategy
    else if (activeSection === 'business-strategy' || activeSection === 'strategy-detail') {
      breadcrumbs.push({
        id: 'business-strategy',
        label: 'Business Strategy',
        icon: 'Target',
        isActive: true
      });
    }

    // Campaigns
    else if (activeSection === 'active-campaigns' || activeSection === 'campaign-detail' || activeSection === 'quick-content-detail' || activeSection === 'campaign-wizard') {
      breadcrumbs.push({
        id: 'active-campaigns',
        label: 'Campaigns',
        icon: 'Megaphone',
        isActive: true
      });
    }

    // Content Library
    else if (activeSection === 'content-library') {
      breadcrumbs.push({
        id: 'content-library',
        label: 'Content Library',
        icon: 'Library',
        isActive: true
      });
    }

    // Content Studio
    else if (activeSection === 'content-studio') {
      breadcrumbs.push({
        id: 'content-studio',
        label: 'Content Studio',
        icon: 'Palette',
        isActive: true
      });
    }

    // Research Bundles
    else if (activeSection === 'research-bundles' || activeSection === 'research-bundle-detail') {
      breadcrumbs.push({
        id: 'research',
        label: 'Research Hub',
        icon: 'FlaskConical',
        route: 'research'
      });
      breadcrumbs.push({
        id: 'research-bundles',
        label: 'Research Bundles',
        isActive: true
      });
    }

    // Custom Validation
    else if (activeSection === 'custom-validation' || activeSection === 'research-custom') {
      breadcrumbs.push({
        id: 'research',
        label: 'Research Hub',
        icon: 'FlaskConical',
        route: 'research'
      });
      breadcrumbs.push({
        id: 'custom-validation',
        label: 'Custom Validation',
        isActive: true
      });
    }

    // Brand Alignment
    else if (activeSection === 'brand-alignment') {
      breadcrumbs.push({
        id: 'brand-alignment',
        label: 'Brand Alignment',
        icon: 'Shield',
        isActive: true
      });
    }

    // Settings
    else if (activeSection.startsWith('settings-')) {
      breadcrumbs.push({
        id: 'settings',
        label: 'Settings',
        icon: 'Settings',
        isActive: true
      });
    }

    // Help
    else if (activeSection === 'help') {
      breadcrumbs.push({
        id: 'help',
        label: 'Help & Support',
        icon: 'HelpCircle',
        isActive: true
      });
    }

    // Help Article Detail
    else if (activeSection === 'help-article') {
      breadcrumbs.push({
        id: 'help',
        label: 'Help & Support',
        icon: 'HelpCircle',
        route: 'help'
      });
      breadcrumbs.push({
        id: 'help-article',
        label: 'Article',
        isActive: true
      });
    }

    // Dashboard
    else if (activeSection === 'dashboard') {
      breadcrumbs.push({
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'LayoutDashboard',
        isActive: true
      });
    }

    return breadcrumbs;
  }, [activeSection, selectedAssetId, selectedPersonaId]);
}
