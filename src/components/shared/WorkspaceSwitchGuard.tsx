'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';

/** BroadcastChannel-naam voor cross-tab workspace-switch-events. */
export const WORKSPACE_SWITCH_CHANNEL = 'branddock-workspace';

/** Payload die OrganizationSwitcher na een succesvolle switch broadcast. */
export interface WorkspaceSwitchMessage {
  type: 'workspace-switched';
  /** Nieuwe actieve workspace; null bij een org-switch (cookie gewist). */
  workspaceId: string | null;
  name: string | null;
}

/**
 * Cross-tab guard tegen "zombie-tabs": de actieve workspace leeft in een
 * browser-globale cookie, dus een switch in tab B maakt tab A stil
 * inconsistent (UI toont workspace A, API's resolven naar B — persists
 * 404'en, autosave verliest data). De switcher reload't alleen z'n eigen tab.
 *
 * Deze component luistert op een BroadcastChannel; meldt een ándere tab een
 * switch naar een ándere workspace dan die van deze tab, dan verschijnt een
 * blocking overlay met een herlaad-CTA. Bewust géén auto-reload: midden in
 * een edit zou dat zelf data-loss veroorzaken.
 *
 * Audit: docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md
 */
export function WorkspaceSwitchGuard() {
  const { t } = useTranslation('shared');
  const { workspaceId } = useWorkspace();
  // Workspace waarmee deze tab is geladen — eerste non-null resolutie wint;
  // latere refetches (die al de nieuwe cookie zien) mogen 'm niet bijwerken.
  const tabWorkspaceRef = useRef<string | null>(null);
  useEffect(() => {
    if (workspaceId && tabWorkspaceRef.current === null) {
      tabWorkspaceRef.current = workspaceId;
    }
  }, [workspaceId]);

  const [switchedTo, setSwitchedTo] = useState<WorkspaceSwitchMessage | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(WORKSPACE_SWITCH_CHANNEL);
    channel.onmessage = (event: MessageEvent<WorkspaceSwitchMessage>) => {
      const msg = event.data;
      if (msg?.type !== 'workspace-switched') return;
      // Switch naar dezelfde workspace als die van deze tab = consistent.
      if (msg.workspaceId && msg.workspaceId === tabWorkspaceRef.current) {
        setSwitchedTo(null);
        return;
      }
      setSwitchedTo(msg);
    };
    return () => channel.close();
  }, []);

  if (!switchedTo) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="workspace-switch-guard-title"
    >
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2">
            <TriangleAlert className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 id="workspace-switch-guard-title" className="text-base font-semibold text-gray-900">
              {t('workspaceSwitch.title')}
            </h2>
            <p className="mt-1.5 text-sm text-gray-600">
              {switchedTo.name
                ? t('workspaceSwitch.nowNamed', { name: switchedTo.name })
                : t('workspaceSwitch.changedGeneric')}{' '}
              {t('workspaceSwitch.warning')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="h-4 w-4" />
          {t('workspaceSwitch.reload')}
        </button>
      </div>
    </div>
  );
}
