'use client';

import { MessageCircle, Sparkles, Copy, Download } from 'lucide-react';

interface QuickActionsCardProps {
  onChat: () => void;
  onRegenerate: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  isLocked: boolean;
}

const ACTIONS = [
  { key: 'chat', label: 'Chat with Persona', icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', needsUnlock: true, hideWhenLocked: false },
  { key: 'regenerate', label: 'Regenerate with AI', icon: Sparkles, color: 'text-blue-600', bg: 'bg-blue-50', needsUnlock: true, hideWhenLocked: true },
  { key: 'duplicate', label: 'Duplicate Persona', icon: Copy, color: 'text-gray-600', bg: 'bg-gray-50', needsUnlock: false, hideWhenLocked: false },
  { key: 'export', label: 'Export Data', icon: Download, color: 'text-gray-600', bg: 'bg-gray-50', needsUnlock: false, hideWhenLocked: false },
] as const;

export function QuickActionsCard({ onChat, onRegenerate, onDuplicate, onExport, isLocked }: QuickActionsCardProps) {
  const handlers: Record<string, () => void> = {
    chat: onChat,
    regenerate: onRegenerate,
    duplicate: onDuplicate,
    export: onExport,
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>

      <div className="space-y-1.5">
        {ACTIONS.map((action) => {
          // Hide certain actions entirely when locked
          if (action.hideWhenLocked && isLocked) return null;

          const Icon = action.icon;
          const disabled = action.needsUnlock && isLocked;

          return (
            <button
              key={action.key}
              onClick={handlers[action.key]}
              disabled={disabled}
              className="w-full flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-left hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className={`h-7 w-7 rounded-md ${action.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-3.5 w-3.5 ${action.color}`} />
              </div>
              <span className="text-xs font-medium text-gray-700">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
