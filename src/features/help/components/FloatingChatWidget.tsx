'use client';

import React from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useHelpStore } from '@/stores/useHelpStore';

export function FloatingChatWidget() {
  const isChatOpen = useHelpStore((s) => s.isChatOpen);
  const openChat = useHelpStore((s) => s.openChat);
  const closeChat = useHelpStore((s) => s.closeChat);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat panel */}
      <div
        className={`absolute bottom-16 right-0 w-80 h-96 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 origin-bottom-right ${
          isChatOpen
            ? 'scale-100 opacity-100'
            : 'scale-95 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-emerald-500 text-white">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Support Chat</span>
          </div>
          <button
            type="button"
            onClick={closeChat}
            className="p-1 rounded hover:bg-emerald-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">Chat coming soon</p>
            <p className="text-xs text-gray-400 mt-1">
              We&apos;re working on live chat support.
            </p>
          </div>
        </div>
      </div>

      {/* Toggle button */}
      <button
        type="button"
        onClick={isChatOpen ? closeChat : openChat}
        className={`w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg flex items-center justify-center transition-all duration-200 ${
          isChatOpen ? 'scale-95' : 'scale-100'
        }`}
        aria-label={isChatOpen ? 'Close chat' : 'Open chat'}
      >
        {isChatOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
}
