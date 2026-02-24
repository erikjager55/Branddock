'use client';

import { MessageCircle, Copy, FileText, Trash2 } from 'lucide-react';

interface QuickActionsCardProps {
  onChat: () => void;
  onDuplicate: () => void;
  onExportPdf: () => void;
  onDelete: () => void;
  isLocked: boolean;
  isDeleting?: boolean;
}

const ACTIONS = [
  { key: 'chat', label: 'Chat with Persona', icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', needsUnlock: true, hideWhenLocked: false },
  { key: 'duplicate', label: 'Duplicate Persona', icon: Copy, color: 'text-gray-600', bg: 'bg-gray-50', needsUnlock: false, hideWhenLocked: false },
  { key: 'export-pdf', label: 'Export PDF', icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50', needsUnlock: false, hideWhenLocked: false },
  { key: 'delete', label: 'Delete Persona', icon: Trash2, color: 'text-red-600', bg: 'bg-red-50', needsUnlock: true, hideWhenLocked: true },
] as const;

export function QuickActionsCard({ onChat, onDuplicate, onExportPdf, onDelete, isLocked, isDeleting }: QuickActionsCardProps) {
  const handlers: Record<string, () => void> = {
    chat: onChat,
    duplicate: onDuplicate,
    'export-pdf': onExportPdf,
    delete: onDelete,
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>

      <div className="space-y-1.5">
        {ACTIONS.map((action) => {
          if (action.hideWhenLocked && isLocked) return null;

          const Icon = action.icon;
          const isDelete = action.key === 'delete';
          const disabled = (action.needsUnlock && isLocked) || (isDelete && isDeleting);

          return (
            <div key={action.key}>
              {isDelete && (
                <div className="border-t border-gray-100 my-2" />
              )}
              <button
                onClick={handlers[action.key]}
                disabled={disabled}
                className={`w-full flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDelete ? 'hover:bg-red-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className={`h-7 w-7 rounded-md ${action.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-3.5 w-3.5 ${action.color}`} />
                </div>
                <span className={`text-xs font-medium ${isDelete ? 'text-red-600' : 'text-gray-700'}`}>
                  {isDelete && isDeleting ? 'Deleting...' : action.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
