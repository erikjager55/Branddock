'use client';

import { ProfileForm } from './ProfileForm';
import { PasswordForm } from './PasswordForm';
import { EmailPreferences } from './EmailPreferences';
import { ConnectedAccounts } from './ConnectedAccounts';
import { DangerZone } from './DangerZone';

export function AccountTab() {
  return (
    <div data-testid="account-tab" className="max-w-3xl space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Account Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your profile, security, and account preferences.
        </p>
      </div>

      <ProfileForm />
      <PasswordForm />
      <EmailPreferences />
      <ConnectedAccounts />
      <DangerZone />
    </div>
  );
}
