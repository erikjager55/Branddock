'use client';

import { useEmailPreferences, useUpdateEmailPreferences } from '@/hooks/use-settings';
import { Card, Skeleton } from '@/components/shared';
import type { UpdateEmailPreferencesRequest, EmailPreferencesData } from '@/types/settings';

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${
          checked ? 'bg-primary' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

const TOGGLE_CONFIG: Array<{
  key: keyof Pick<EmailPreferencesData, 'productUpdates' | 'researchNotifications' | 'teamActivity' | 'marketing'>;
  label: string;
  description: string;
}> = [
  {
    key: 'productUpdates',
    label: 'Product Updates',
    description: 'Receive emails about new features and product improvements.',
  },
  {
    key: 'researchNotifications',
    label: 'Research Notifications',
    description: 'Get notified when research results are ready or need attention.',
  },
  {
    key: 'teamActivity',
    label: 'Team Activity',
    description: 'Stay updated on team member actions and collaboration events.',
  },
  {
    key: 'marketing',
    label: 'Marketing',
    description: 'Receive tips, best practices, and promotional content.',
  },
];

export function EmailPreferences() {
  const { data, isLoading } = useEmailPreferences();
  const updatePrefs = useUpdateEmailPreferences();

  const preferences = data?.preferences;

  function handleToggle(key: keyof UpdateEmailPreferencesRequest, value: boolean) {
    updatePrefs.mutate({ [key]: value });
  }

  if (isLoading) {
    return (
      <Card>
        <Skeleton className="rounded" width="40%" height={20} />
        <div className="mt-4 space-y-3">
          <Skeleton className="rounded" width="100%" height={48} />
          <Skeleton className="rounded" width="100%" height={48} />
          <Skeleton className="rounded" width="100%" height={48} />
          <Skeleton className="rounded" width="100%" height={48} />
        </div>
      </Card>
    );
  }

  if (!preferences) return null;

  return (
    <Card>
      <h3 className="text-base font-semibold text-gray-900 mb-2">Email Preferences</h3>

      <div className="divide-y divide-gray-100">
        {TOGGLE_CONFIG.map((toggle) => (
          <ToggleRow
            key={toggle.key}
            label={toggle.label}
            description={toggle.description}
            checked={preferences[toggle.key]}
            onChange={(val) => handleToggle(toggle.key, val)}
          />
        ))}
      </div>
    </Card>
  );
}
