'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInviteMember } from '@/hooks/use-settings';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Modal, Input, Select, Button } from '@/components/shared';
import { Mail } from 'lucide-react';

export function InviteMemberModal() {
  const { t } = useTranslation('settings-team');
  const isOpen = useSettingsStore((s) => s.isInviteModalOpen);
  const setIsOpen = useSettingsStore((s) => s.setIsInviteModalOpen);

  const ROLE_OPTIONS = [
    { value: 'admin', label: t('roles.admin') },
    { value: 'member', label: t('roles.member') },
    { value: 'viewer', label: t('roles.viewer') },
  ];

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string | null>('member');
  const [error, setError] = useState<string | null>(null);

  const inviteMember = useInviteMember();

  function handleClose() {
    setEmail('');
    setRole('member');
    setError(null);
    setIsOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) return;

    try {
      await inviteMember.mutateAsync({
        email: email.trim(),
        role: role ?? 'member',
      });
      handleClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('invite.errorSendFailed');
      if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('already')) {
        setError(t('invite.errorAlreadyInvited'));
      } else if (message.toLowerCase().includes('seat') || message.toLowerCase().includes('limit')) {
        setError(t('invite.errorSeatLimit'));
      } else {
        setError(message);
      }
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
      </form>
    </Modal>
  );
}
