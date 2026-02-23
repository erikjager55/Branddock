'use client';

import { useMemo } from 'react';

export interface LockVisibility {
  // Hidden when locked
  showEmptySections: boolean;
  showAITools: boolean;
  showResearchMethods: boolean;
  showGeneratePhoto: boolean;
  showRegenerateButton: boolean;

  // Always visible (read-only when locked)
  showFilledSections: true;
  showCompletedResearch: true;
  showExistingChats: true;
  showExportOptions: true;
  showDuplicateOption: true;
  showChat: true;
}

export function useLockVisibility(isLocked: boolean): LockVisibility {
  return useMemo(
    () => ({
      // Hidden when locked
      showEmptySections: !isLocked,
      showAITools: !isLocked,
      showResearchMethods: !isLocked,
      showGeneratePhoto: !isLocked,
      showRegenerateButton: !isLocked,

      // Always visible
      showFilledSections: true as const,
      showCompletedResearch: true as const,
      showExistingChats: true as const,
      showExportOptions: true as const,
      showDuplicateOption: true as const,
      showChat: true as const,
    }),
    [isLocked],
  );
}
