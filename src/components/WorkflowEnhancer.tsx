/**
 * WORKFLOW ENHANCER COMPONENT
 *
 * Main integration component that adds all workflow enhancement features:
 * - Global search (Cmd+K)
 */

import React from 'react';
import { GlobalSearchModal } from './GlobalSearchModal';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { KeyboardShortcut } from '../types/workflow';
import { useShellStore } from '../stores/useShellStore';

interface WorkflowEnhancerProps {
  onNavigate: (route: string) => void;
  onAction?: (actionId: string) => void;
  children: React.ReactNode;
}

export function WorkflowEnhancer({
  onNavigate,
  onAction,
  children,
}: WorkflowEnhancerProps) {
  const { isSearchModalOpen, openSearch, closeSearch, isNotificationPanelOpen, closeNotifications } = useShellStore();

  // Define global keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'mod+k',
      label: 'Open Search',
      description: 'Search everything',
      action: () => openSearch(),
      category: 'general'
    },
    {
      key: 'esc',
      label: 'Close/Cancel',
      description: 'Close modals or cancel current action',
      action: () => {
        closeSearch();
        closeNotifications();
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
        isOpen={isSearchModalOpen}
        onClose={() => closeSearch()}
        onNavigate={onNavigate}
        onAction={onAction}
      />
    </>
  );
}
