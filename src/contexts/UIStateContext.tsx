/**
 * UI State Context
 * 
 * Global state management for UI-related states like navigation,
 * sidebar collapse, modals, etc.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UIStateContextType {
  // Navigation
  activeSection: string;
  setActiveSection: (section: string) => void;
  
  // Asset viewing
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
  
  // Research options
  selectedResearchOption: string | null;
  setSelectedResearchOption: (id: string | null) => void;
  
  // View states
  viewingAssetResults: boolean;
  setViewingAssetResults: (viewing: boolean) => void;
  
  // Sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  
  // Modals/Dialogs
  showApproachSelection: boolean;
  setShowApproachSelection: (show: boolean) => void;
  
  // Helper functions
  navigateToAsset: (assetId: string) => void;
  navigateToSection: (section: string) => void;
  resetAssetStates: () => void;
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

export function UIStateProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSectionState] = useState('personas');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedResearchOption, setSelectedResearchOption] = useState<string | null>(null);
  const [viewingAssetResults, setViewingAssetResults] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showApproachSelection, setShowApproachSelection] = useState(false);

  const setActiveSection = (section: string) => {
    setActiveSectionState(section);
    
    // If navigating away from brand assets, reset asset-related states
    if (!section.startsWith('brand-') && section !== 'brand') {
      resetAssetStates();
    }
  };

  const navigateToAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    setSelectedResearchOption(null);
    setViewingAssetResults(true);
    setActiveSectionState(`brand-${assetId}`);
  };

  const navigateToSection = (section: string) => {
    setActiveSection(section);
  };

  const resetAssetStates = () => {
    setSelectedAssetId(null);
    setSelectedResearchOption(null);
    setViewingAssetResults(false);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  return (
    <UIStateContext.Provider
      value={{
        activeSection,
        setActiveSection,
        selectedAssetId,
        setSelectedAssetId,
        selectedResearchOption,
        setSelectedResearchOption,
        viewingAssetResults,
        setViewingAssetResults,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        showApproachSelection,
        setShowApproachSelection,
        navigateToAsset,
        navigateToSection,
        resetAssetStates,
      }}
    >
      {children}
    </UIStateContext.Provider>
  );
}

export function useUIState() {
  const context = useContext(UIStateContext);
  if (context === undefined) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
}