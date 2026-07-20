'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchWorkspaces } from '@/lib/api/workspaces';
import { Building2 } from 'lucide-react';

interface WorkspaceAccessPickerProps {
  /** Leeg array = alle werkomgevingen. */
  value: string[];
  onChange: (workspaceIds: string[]) => void;
  disabled?: boolean;
}

/**
 * Kiezer voor per-workspace toegang: "alle werkomgevingen" (lege selectie)
 * of een expliciete subset. Gedeeld door InviteMemberModal en
 * MemberWorkspaceAccessModal.
 */
export function WorkspaceAccessPicker({ value, onChange, disabled }: WorkspaceAccessPickerProps) {
  const { t } = useTranslation('settings-team');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['workspaces', 'list'],
    queryFn: fetchWorkspaces,
  });

  const workspaces = data?.workspaces ?? [];
  const allSelected = value.length === 0;

  function selectAll() {
    onChange([]);
  }

  function selectSpecific() {
    // Start met de actieve workspace aangevinkt — dat is vrijwel altijd
    // "nodig iemand uit voor déze werkomgeving".
    if (value.length === 0) {
      onChange(data?.activeWorkspaceId ? [data.activeWorkspaceId] : []);
    }
  }

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  if (isError) return null;

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{t('workspaceAccess.pickerLabel')}</p>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="radio"
            name="workspace-access-mode"
            checked={allSelected}
            onChange={selectAll}
            disabled={disabled}
            className="accent-[var(--primary)]"
          />
          {t('workspaceAccess.allLabel')}
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="radio"
            name="workspace-access-mode"
            checked={!allSelected}
            onChange={selectSpecific}
            disabled={disabled || workspaces.length === 0}
            className="accent-[var(--primary)]"
          />
          {t('workspaceAccess.specificLabel')}
        </label>

        {!allSelected && (
          <div className="ml-6 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
            {isLoading && (
              <div className="px-3 py-2 text-sm text-gray-400">…</div>
            )}
            {workspaces.map((ws) => (
              <label
                key={ws.id}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={value.includes(ws.id)}
                  onChange={() => toggle(ws.id)}
                  disabled={disabled}
                  className="accent-[var(--primary)]"
                />
                <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{ws.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
