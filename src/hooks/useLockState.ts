'use client';

import { useState, useCallback, useMemo } from 'react';

type EntityType = 'personas' | 'brand-assets' | 'products' | 'campaigns' | 'strategies' | 'interviews';

interface LockInitialState {
  isLocked: boolean;
  lockedAt?: string | null;
  lockedBy?: { id: string; name: string } | null;
}

interface UseLockStateOptions {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  initialState: LockInitialState;
  onLockChange?: (isLocked: boolean) => void;
}

export interface UseLockStateReturn {
  isLocked: boolean;
  lockedAt: string | null;
  lockedBy: { id: string; name: string } | null;
  isToggling: boolean;
  showConfirm: boolean;
  requestToggle: () => void;
  confirmToggle: () => Promise<void>;
  cancelToggle: () => void;
  canEdit: boolean;
  canDelete: boolean;
  canStartResearch: boolean;
  canGenerateAI: boolean;
  canStartChat: boolean;
}

export function useLockState({
  entityType,
  entityId,
  entityName,
  initialState,
  onLockChange,
}: UseLockStateOptions): UseLockStateReturn {
  const [isLocked, setIsLocked] = useState(initialState.isLocked);
  const [lockedAt, setLockedAt] = useState<string | null>(initialState.lockedAt ?? null);
  const [lockedBy, setLockedBy] = useState<{ id: string; name: string } | null>(
    initialState.lockedBy ?? null,
  );
  const [isToggling, setIsToggling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Sync with external state changes (e.g. after refetch)
  const prevLocked = initialState.isLocked;
  if (prevLocked !== isLocked && !isToggling) {
    setIsLocked(prevLocked);
    setLockedAt(initialState.lockedAt ?? null);
    setLockedBy(initialState.lockedBy ?? null);
  }

  const requestToggle = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const cancelToggle = useCallback(() => {
    setShowConfirm(false);
  }, []);

  const confirmToggle = useCallback(async () => {
    const newLocked = !isLocked;
    setIsToggling(true);
    setShowConfirm(false);

    try {
      const res = await fetch(`/api/${entityType}/${entityId}/lock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked: newLocked }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to toggle lock');
      }

      const data = await res.json();
      setIsLocked(data.isLocked);
      setLockedAt(data.lockedAt ?? null);
      setLockedBy(data.lockedBy ?? null);
      onLockChange?.(data.isLocked);
    } catch (err) {
      console.error(`[useLockState] Failed to toggle lock for ${entityName}:`, err);
    } finally {
      setIsToggling(false);
    }
  }, [isLocked, entityType, entityId, entityName, onLockChange]);

  const permissions = useMemo(
    () => ({
      canEdit: !isLocked,
      canDelete: !isLocked,
      canStartResearch: !isLocked,
      canGenerateAI: !isLocked,
      canStartChat: !isLocked,
    }),
    [isLocked],
  );

  return {
    isLocked,
    lockedAt,
    lockedBy,
    isToggling,
    showConfirm,
    requestToggle,
    confirmToggle,
    cancelToggle,
    ...permissions,
  };
}
