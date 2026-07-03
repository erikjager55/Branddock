'use client';

import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { Plus, MessageSquare, Trash2, Search, X, Pencil, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useClawStore } from '@/stores/useClawStore';
import type { ClawConversationMeta, ClawConversationFull } from '@/lib/claw/claw.types';

export function ConversationSidebar() {
  const { t } = useTranslation('claw');
  const {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversation,
    startNewConversation,
    closeHistoryPopover,
  } = useClawStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const pendingDeleteTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Fetch conversation list on mount
  useEffect(() => {
    fetchConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear any pending delete timers on unmount so they don't fire after sidebar closes
  useEffect(() => {
    const timers = pendingDeleteTimers.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/claw/conversations');
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations as ClawConversationMeta[]);
    } catch {
      // Silently fail — sidebar is non-critical
    }
  }, [setConversations]);

  const handleLoad = useCallback(async (id: string) => {
    if (id === activeConversationId) return;
    if (renamingId) return; // don't navigate while renaming
    try {
      const res = await fetch(`/api/claw/conversations/${id}`);
      if (!res.ok) return;
      const data: ClawConversationFull = await res.json();
      const messages = Array.isArray(data.messages) ? data.messages : [];
      setActiveConversation(data.id, messages);
      // Close the panel-mode history popover on select so user sees the chat
      closeHistoryPopover();
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  }, [activeConversationId, setActiveConversation, renamingId, closeHistoryPopover]);

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic remove from UI + toast with Undo for 5s
    const removed = conversations.find((c) => c.id === id);
    if (!removed) return;
    const remainingConversations = conversations.filter((c) => c.id !== id);
    setConversations(remainingConversations);
    if (id === activeConversationId) {
      startNewConversation();
    }

    const timer = setTimeout(async () => {
      pendingDeleteTimers.current.delete(id);
      try {
        await fetch(`/api/claw/conversations/${id}`, { method: 'DELETE' });
      } catch {
        // Silently fail — on error conversation will reappear on next fetch
      }
    }, 5000);
    pendingDeleteTimers.current.set(id, timer);

    toast(t('sidebar.deleted', { title: removed.title ?? t('sidebar.untitled') }), {
      duration: 5000,
      action: {
        label: t('sidebar.undo'),
        onClick: () => {
          const pending = pendingDeleteTimers.current.get(id);
          if (pending) {
            clearTimeout(pending);
            pendingDeleteTimers.current.delete(id);
          }
          // Restore, preserving original position
          setConversations([removed, ...remainingConversations]);
        },
      },
    });
  }, [conversations, activeConversationId, setConversations, startNewConversation, t]);

  const startRename = useCallback((conv: ClawConversationMeta, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(conv.id);
    setRenameValue(conv.title ?? '');
  }, []);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue('');
  }, []);

  const commitRename = useCallback(async () => {
    if (!renamingId) return;
    const next = renameValue.trim();
    const target = conversations.find((c) => c.id === renamingId);
    if (!target || next === '' || next === target.title) {
      cancelRename();
      return;
    }
    // Optimistic update
    setConversations(conversations.map((c) => (c.id === renamingId ? { ...c, title: next } : c)));
    setRenamingId(null);
    setRenameValue('');
    try {
      await fetch(`/api/claw/conversations/${renamingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: next }),
      });
    } catch {
      // Rollback on error
      setConversations(conversations);
      toast.error(t('sidebar.renameFailed'));
    }
  }, [renamingId, renameValue, conversations, setConversations, cancelRename, t]);

  // Filter then group
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => (c.title ?? t('sidebar.untitled')).toLowerCase().includes(q));
  }, [conversations, searchQuery, t]);
  const grouped = groupByDate(filtered);

  return (
    <div className="flex flex-col h-full">
      {/* Header: New + Search */}
      <div className="px-3 py-3 border-b border-gray-200 space-y-2">
        <button
          onClick={startNewConversation}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-white hover:border-gray-300 transition-colors"
        >
          <Plus size={14} />
          {t('sidebar.newConversation')}
        </button>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('sidebar.searchPlaceholder')}
            className="w-full pl-7 pr-7 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600"
              aria-label={t('sidebar.clearSearch')}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {grouped.map(({ id, items }) => (
          <div key={id} className="mb-3">
            <div className="px-2 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
              {t(`sidebar.groups.${id}`)}
            </div>
            {items.map((conv) => {
              const isRenaming = renamingId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => handleLoad(conv.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !isRenaming) handleLoad(conv.id); }}
                  onDoubleClick={(e) => startRename(conv, e)}
                  className={`w-full group flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left cursor-pointer transition-colors ${
                    conv.id === activeConversationId
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <MessageSquare size={14} className="flex-shrink-0 text-gray-400" />
                  {isRenaming ? (
                    <input
                       
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') cancelRename();
                      }}
                      onBlur={commitRename}
                      className="flex-1 min-w-0 px-1.5 py-0.5 rounded border border-teal-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  ) : (
                    <span className="flex-1 truncate" title={conv.title || t('sidebar.untitled')}>
                      {conv.title || t('sidebar.untitled')}
                    </span>
                  )}
                  {isRenaming ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); commitRename(); }}
                      className="p-0.5 rounded text-teal-600 hover:text-teal-700"
                      aria-label={t('sidebar.saveRename')}
                    >
                      <Check size={13} />
                    </button>
                  ) : (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startRename(conv, e)}
                        className="p-0.5 rounded text-gray-400 hover:text-gray-700"
                        aria-label={t('sidebar.rename')}
                        title={t('sidebar.renameTitle')}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(conv.id, e)}
                        className="p-0.5 rounded text-gray-400 hover:text-red-500"
                        aria-label={t('sidebar.delete')}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {conversations.length === 0 && !searchQuery && (
          <div className="px-3 py-8 text-center text-xs text-gray-400">
            {t('sidebar.empty')}
          </div>
        )}
        {conversations.length > 0 && filtered.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-gray-400">
            {t('sidebar.noMatches', { query: searchQuery })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────

function groupByDate(conversations: ClawConversationMeta[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { id: 'today' | 'yesterday' | 'thisWeek' | 'older'; items: ClawConversationMeta[] }[] = [
    { id: 'today', items: [] },
    { id: 'yesterday', items: [] },
    { id: 'thisWeek', items: [] },
    { id: 'older', items: [] },
  ];

  for (const conv of conversations) {
    const date = new Date(conv.lastMessageAt);
    if (date >= today) {
      groups[0].items.push(conv);
    } else if (date >= yesterday) {
      groups[1].items.push(conv);
    } else if (date >= weekAgo) {
      groups[2].items.push(conv);
    } else {
      groups[3].items.push(conv);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}
