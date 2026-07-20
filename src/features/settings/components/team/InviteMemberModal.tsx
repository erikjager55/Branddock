'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInviteMember } from '@/hooks/use-settings';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useWorkspace } from '@/hooks/use-workspace';
import { Modal, Input, Select, Button } from '@/components/shared';
import { Mail } from 'lucide-react';
import { ApiError, translateApiError } from '@/lib/api/api-error';
import { WorkspaceAccessPicker } from './WorkspaceAccessPicker';

export function InviteMemberModal() {
  const { t } = useTranslation(['settings-team', 'entitlement-errors']);
  const isOpen = useSettingsStore((s) => s.isInviteModalOpen);
  const setIsOpen = useSettingsStore((s) => s.setIsInviteModalOpen);
  const { organizationId } = useWorkspace();

  const ROLE_OPTIONS = [
    { value: 'admin', label: t('roles.admin') },
    { value: 'member', label: t('roles.member') },
    { value: 'viewer', label: t('roles.viewer') },
  ];

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string | null>('member');
  const [workspaceIds, setWorkspaceIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const inviteMember = useInviteMember();

  // ACL geldt alleen voor member/viewer — admins zien altijd alles.
  const supportsScoping = role === 'member' || role === 'viewer';

  function handleClose() {
    setEmail('');
    setRole('member');
    setWorkspaceIds([]);
    setError(null);
    setIsOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !organizationId) return;

    try {
      await inviteMember.mutateAsync({
        email: email.trim(),
        role: role ?? 'member',
        organizationId,
        workspaceIds: supportsScoping ? workspaceIds : [],
      });
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? translateApiError(t, err) : t('invite.errorSendFailed'));
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('invite.title')}
      subtitle={t('invite.subtitle')}
      size="sm"
      footer={
        <div className="flex justify-end gap-3 pt-3">
          <Button variant="secondary" onClick={handleClose}>
            {t('invite.cancel')}
          </Button>
          <Button
            data-testid="invite-submit-button"
            variant="cta"
            onClick={handleSubmit}
            disabled={!email.trim()}
            isLoading={inviteMember.isPending}
          >
            {t('invite.send')}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('invite.emailLabel')}
          type="email"
          placeholder={t('invite.emailPlaceholder')}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          icon={Mail}
          error={error ?? undefined}
          required
        />

        <Select
          label={t('invite.roleLabel')}
          value={role}
          onChange={setRole}
          options={ROLE_OPTIONS}
          placeholder={t('invite.rolePlaceholder')}
        />

        {supportsScoping ? (
          <WorkspaceAccessPicker value={workspaceIds} onChange={setWorkspaceIds} />
        ) : (
          <p className="text-xs text-gray-500">{t('workspaceAccess.adminNote')}</p>
        )}
      </form>
    </Modal>
  );
}
