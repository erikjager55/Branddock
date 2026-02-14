/**
 * WORKFLOW ENHANCER COMPONENT
 * 
 * Main integration component that adds all workflow enhancement features:
 * - Global search (Cmd+K)
 */

import React, { useState, useEffect } from 'react';
import { GlobalSearchModal } from './GlobalSearchModal';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { KeyboardShortcut } from '../types/workflow';

interface WorkflowEnhancerProps {
  onNavigate: (route: string) => void;
  onAction?: (actionId: string) => void;
  children: React.ReactNode;
  searchOpen?: boolean;
  setSearchOpen?: (open: boolean) => void;
  activityOpen?: boolean;
  setActivityOpen?: (open: boolean) => void;
}

export function WorkflowEnhancer({ 
  onNavigate, 
  onAction, 
  children,
  searchOpen: externalSearchOpen,
  setSearchOpen: externalSetSearchOpen,
  activityOpen: externalActivityOpen,
  setActivityOpen: externalSetActivityOpen
}: WorkflowEnhancerProps) {
  // Internal state as fallback
  const [internalSearchOpen, setInternalSearchOpen] = useState(false);
  const [internalActivityOpen, setInternalActivityOpen] = useState(false);

  // Use external state if provided, otherwise use internal state
  const searchOpen = externalSearchOpen !== undefined ? externalSearchOpen : internalSearchOpen;
  const setSearchOpen = externalSetSearchOpen || setInternalSearchOpen;
  
  const activityOpen = externalActivityOpen !== undefined ? externalActivityOpen : internalActivityOpen;
  const setActivityOpen = externalSetActivityOpen || setInternalActivityOpen;

  // Define global keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'mod+k',
      label: 'Open Search',
      description: 'Search everything',
      action: () => setSearchOpen(true),
      category: 'general'
    },
    {
      key: 'esc',
      label: 'Close/Cancel',
      description: 'Close modals or cancel current action',
      action: () => {
        setSearchOpen(false);
        setActivityOpen(false);
      },
      category: 'general'
    }
  ];

  // Register shortcuts
  useKeyboardShortcuts(shortcuts);

  return (
    <>
      {children}

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={onNavigate}
        onAction={onAction}
      />
    </>
  );
}