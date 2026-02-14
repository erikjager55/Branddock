/**
 * CUSTOM HOOK: useBreadcrumbs
 * 
 * Generates breadcrumbs based on current route/section.
 */

import { useMemo } from 'react';
import { BreadcrumbItem } from '../types/workflow';
import { mockBrandAssets } from '../data/mock-brand-assets';
import { mockPersonas } from '../data/mock-personas';

export function useBreadcrumbs(
  activeSection: string,
  selectedAssetId?: string,
  selectedPersonaId?: string
): BreadcrumbItem[] {
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
      const asset = mockBrandAssets.find(a => a.id === selectedAssetId);
      
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
    else if (activeSection === 'research') {
      breadcrumbs.push({
        id: 'research',
        label: 'Research Hub',
        icon: 'Target',
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
      const persona = mockPersonas.find(p => p.id === selectedPersonaId);
      
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
        icon: 'Target',
        route: 'research'
      });
      breadcrumbs.push({
        id: 'research-plans',
        label: 'Research Plans',
        isActive: true
      });
    }

    return breadcrumbs;
  }, [activeSection, selectedAssetId, selectedPersonaId]);
}
