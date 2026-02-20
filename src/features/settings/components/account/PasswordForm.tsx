'use client';

import { useState } from 'react';
import { useChangePassword } from '@/hooks/use-settings';
import { Button, Input, Card } from '@/components/shared';
import { Lock } from 'lucide-react';

export function PasswordForm() {
  const changePassword = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isNewPasswordValid = newPassword.length >= 8;
  const doPasswordsMatch = newPassword === confirmPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    isNewPasswordValid &&
    doPasswordsMatch &&
    !changePassword.isPending;

  function handleSubmit() {
    setError(null);
    setSuccess(false);

    if (!isNewPasswordValid) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (!doPasswordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setSuccess(true);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Failed to change password.');
        },
      },
    );
  }

  return (
    <Card>
      <h3 data-testid="password-form" className="text-base font-semibold text-gray-900 mb-4">Change Password</h3>

      <div className="space-y-4">
        <Input
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter current password"
          icon={Lock}
          required
        />

        <Input
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Minimum 8 characters"
          icon={Lock}
          required
          error={newPassword.length > 0 && !isNewPasswordValid ? 'Must be at least 8 characters' : undefined}
        />

        <Input
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
          icon={Lock}
          required
          error={confirmPassword.length > 0 && !doPasswordsMatch ? 'Passwords do not match' : undefined}
        />
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      {success && (
        <p className="mt-3 text-sm text-emerald-600">Password updated successfully.</p>
      )}

      <div className="mt-6 flex justify-end">
        <Button
          data-testid="password-update-button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          isLoading={changePassword.isPending}
        >
          Update Password
        </Button>
      </div>
    </Card>
  );
}
