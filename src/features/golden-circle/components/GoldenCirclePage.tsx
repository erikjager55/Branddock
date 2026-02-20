'use client';

import { useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { SkeletonCard, Button } from '@/components/shared';
import { PageShell, PageHeader } from '@/components/ui/layout';
import {
  useGoldenCircleData,
  useUpdateGoldenCircle,
  useToggleGoldenCircleLock,
} from '../hooks/useGoldenCircle';
import { useGoldenCircleStore } from '../stores/useGoldenCircleStore';
import { GoldenCircleCanvas } from './GoldenCircleCanvas';
import { GoldenCircleEditModal } from './GoldenCircleEditModal';
import { GoldenCircleHistory } from './GoldenCircleHistory';
import type { GoldenCircleRing } from '../types/golden-circle.types';

interface GoldenCirclePageProps {
  assetId: string;
  onBack: () => void;
}

export function GoldenCirclePage({ assetId, onBack }: GoldenCirclePageProps) {
  const { data, isLoading } = useGoldenCircleData(assetId);
  const updateGC = useUpdateGoldenCircle(assetId);
  const toggleLock = useToggleGoldenCircleLock(assetId);

  const isEditing = useGoldenCircleStore((s) => s.isEditing);
  const editingRing = useGoldenCircleStore((s) => s.editingRing);
  const isLocked = useGoldenCircleStore((s) => s.isLocked);
  const openEdit = useGoldenCircleStore((s) => s.openEdit);
  const closeEdit = useGoldenCircleStore((s) => s.closeEdit);
  const setLocked = useGoldenCircleStore((s) => s.setLocked);

  // Sync lock state from server
  useEffect(() => {
    if (data) {
      setLocked(data.isLocked);
    }
  }, [data, setLocked]);

  const handleToggleLock = () => {
    toggleLock.mutate(!isLocked, {
      onSuccess: (result) => {
        setLocked(result.isLocked);
      },
    });
  };

  const handleEdit = (ring: GoldenCircleRing) => {
    if (!isLocked) {
      openEdit(ring);
    }
  };

  const handleSave = (updateData: {
    [K in GoldenCircleRing]?: { statement: string; details: string };
  }) => {
    updateGC.mutate(updateData, {
      onSuccess: () => closeEdit(),
    });
  };

  if (isLoading || !data) {
    return (
      <PageShell>
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        moduleKey="brand-foundation"
        title="Golden Circle Canvas"
        subtitle="Define your WHY, HOW, and WHAT"
        actions={
          <Button
            variant={isLocked ? 'secondary' : 'primary'}
            size="sm"
            icon={isLocked ? Lock : Unlock}
            onClick={handleToggleLock}
            isLoading={toggleLock.isPending}
          >
            {isLocked ? 'Locked' : 'Unlocked'}
          </Button>
        }
      />

      <GoldenCircleCanvas
        data={data}
        isLocked={isLocked}
        onEdit={handleEdit}
      />

      <GoldenCircleHistory assetId={assetId} />

      <GoldenCircleEditModal
        isOpen={isEditing}
        ring={editingRing}
        data={data}
        onClose={closeEdit}
        onSave={handleSave}
        isSaving={updateGC.isPending}
      />
    </PageShell>
  );
}
