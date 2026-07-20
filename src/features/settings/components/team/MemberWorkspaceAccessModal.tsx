'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateMemberWorkspaceAccess } from '@/hooks/use-settings';
import { Modal, Button } from '@/components/shared';
import { WorkspaceAccessPicker } from './WorkspaceAccessPicker';
import type { TeamMemberItem } from '@/types/settings';

interface MemberWorkspaceAccessModalProps {
  member: TeamMemberItem;
  isOpen: boolean;
  onClose: () => void;
}

/** Beheert de WorkspaceMemberAccess-ACL van een bestaand member/viewer-lid. */
export function MemberWorkspaceAccessModal({ member, isOpen, onClose }: MemberWorkspaceAccessModalProps) {
  const { t } = useTranslation('settings-team');
  const [workspaceIds, setWorkspaceIds] = useState<string[]>(member.workspaceIds);
  const [error, setError] = useState<string | null>(null);
  const updateAccess = useUpdateMemberWorkspaceAccess();

  async function handleSave() {
    setError(null);
    try {
      await updateAccess.mutateAsync({ memberId: member.id, workspaceIds });
      onClose();
    } catch {
      setError(t('workspaceAccess.errorSaveFailed'));
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('workspaceAccess.modalTitle', { name: member.name })}
      subtitle={t('workspaceAccess.modalSubtitle')}
      size="sm"
      footer={
        <div className="flex justify-end gap-3 pt-3">
          <Button variant="secondary" onClick={onClose}>
            {t('invite.cancel')}
          </Button>
          <Button
            variant="cta"
            onClick={handleSave}
            isLoading={updateAccess.isPending}
          >
            {t('workspaceAccess.save')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <WorkspaceAccessPicker value={workspaceIds} onChange={setWorkspaceIds} />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
