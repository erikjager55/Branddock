'use client';

import React, { useEffect, useCallback } from 'react';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { useClawStore } from '@/stores/useClawStore';
import type { ClawConversationMeta, ClawConversationFull } from '@/lib/claw/claw.types';

export function ConversationSidebar() {
  const {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversation,
    startNewConversation,
  } = useClawStore();

  // Fetch conversation list on mount
  useEffect(() => {
    fetchConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    try {
      const res = await fetch(`/api/claw/conversations/${id}`);
      if (!res.ok) return;
      const data: ClawConversationFull = await res.json();
      // messages is a Json field — ensure it's an array
      const messages = Array.isArray(data.messages) ? data.messages : [];
      setActiveConversation(data.id, messages);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  }, [activeConversationId, setActiveConversation]);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/claw/conversations/${id}`, { method: 'DELETE' });
      setConversations(conversations.filter((c) => c.id !== id));
      if (id === activeConversationId) {
        startNewConversation();
      }
    } catch {
      // Silently fail
    }
  }, [conversations, activeConversationId, setConversations, startNewConversation]);

  // Group by date
  const grouped = groupByDate(conversations);

  return (
    <div className="flex flex-col h-full">
      {/* New conversation button */}
      <div className="px-3 py-3 border-b border-gray-200">
        <button
          onClick={startNewConversation}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-white hover:border-gray-300 transition-colors"
        >
          <Plus size={14} />
          New conversation
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {grouped.map(({ label, items }) => (
          <div key={label} className="mb-3">
            <div className="px-2 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
              {label}
            </div>
            {items.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleLoad(conv.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLoad(conv.id); }}
                className={`w-full group flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left cursor-pointer transition-colors ${
                  conv.id === activeConversationId
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <MessageSquare size={14} className="flex-shrink-0 text-gray-400" />
                <span className="flex-1 truncate">
                  {conv.title || 'Untitled'}
                </span>
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-red-500 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ))}

        {conversations.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-gray-400">
            No conversations yet
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

  const groups: { label: string; items: ClawConversationMeta[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This Week', items: [] },
    { label: 'Older', items: [] },
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
