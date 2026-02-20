'use client';

import { useState } from 'react';
import { useInviteMember } from '@/hooks/use-settings';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Modal, Input, Select, Button } from '@/components/shared';
import { Mail } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

export function InviteMemberModal() {
  const isOpen = useSettingsStore((s) => s.isInviteModalOpen);
  const setIsOpen = useSettingsStore((s) => s.setIsInviteModalOpen);

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
        err instanceof Error ? err.message : 'Failed to send invitation';
      if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('already')) {
        setError('This email has already been invited.');
      } else if (message.toLowerCase().includes('seat') || message.toLowerCase().includes('limit')) {
        setError('Seat limit reached. Upgrade your plan to invite more members.');
      } else {
        setError(message);
      }
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Team Member"
      subtitle="Send an invitation to collaborate on your workspace."
      size="sm"
      footer={
        <div className="flex justify-end gap-3 pt-3">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            data-testid="invite-submit-button"
            variant="cta"
            onClick={handleSubmit}
            disabled={!email.trim()}
            isLoading={inviteMember.isPending}
          >
            Send Invitation
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="colleague@company.com"
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
          label="Role"
          value={role}
          onChange={setRole}
          options={ROLE_OPTIONS}
          placeholder="Select a role..."
        />
      </form>
    </Modal>
  );
}
