'use client';

import React from 'react';
import { Bot } from 'lucide-react';
import { resolveIcon } from '@/lib/icons/icon-registry';

/**
 * Resolve the persona's Lucide icon-name string (registry data) to a
 * component — same pattern as EnhancedSidebarSimple.getIcon, with Bot
 * as agent-appropriate fallback.
 */
export function resolveAgentIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return resolveIcon(iconName, Bot);
}

/** Gradient icon-tile for an agent persona (module-gradient style). */
export function AgentIconTile({
  iconName,
  size = 'md',
}: {
  iconName: string;
  size?: 'md' | 'lg';
}) {
  const Icon = resolveAgentIcon(iconName);
  const container = size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-12 w-12 rounded-xl';
  const icon = size === 'lg' ? 'h-7 w-7' : 'h-6 w-6';
  return (
    <div
      className={`${container} bg-gradient-to-br from-[#1FD1B2] to-emerald-500 flex items-center justify-center flex-shrink-0`}
    >
      <Icon className={`${icon} text-white`} />
    </div>
  );
}
