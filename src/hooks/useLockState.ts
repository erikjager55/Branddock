'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { LockError } from '@/lib/api/client';

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
  const initialLocked = initialState.isLocked;
  const initialLockedAt = initialState.lockedAt;
  const initialLockedBy = initialState.lockedBy;

  useEffect(() => {
    if (!isToggling) {
      setIsLocked(initialLocked);
      setLockedAt(initialLockedAt ?? null);
      setLockedBy(initialLockedBy ?? null);
    }
  }, [initialLocked, initialLockedAt, initialLockedBy]);

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

      if (res.status === 423) {
        const data = await res.json().catch(() => ({}));
        toast.error('Item is locked', {
          description: data.error || 'Unlock the item to make changes.',
        });
        throw new LockError(data.error);
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to toggle lock');
      }

      const data = await res.json();
      setIsLocked(data.isLocked);
      setLockedAt(data.lockedAt ?? null);
      setLockedBy(data.lockedBy ?? null);
      onLockChange?.(data.isLocked);

      toast.success(data.isLocked ? 'Item locked' : 'Item unlocked', {
        description: data.isLocked
          ? `${entityName} is now protected from changes.`
          : `${entityName} can be edited again.`,
      });
    } catch (err) {
      if (!(err instanceof LockError)) {
        toast.error('Lock toggle failed', {
          description: `Could not toggle lock for ${entityName}. Please try again.`,
        });
      }
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
      canStartChat: true,
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
