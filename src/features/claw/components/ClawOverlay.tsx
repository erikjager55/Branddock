'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, Plus, PanelLeftClose, PanelLeftOpen, Download, Maximize2, Minimize2 } from 'lucide-react';
import { useClawStore } from '@/stores/useClawStore';
import { ChatArea } from './ChatArea';
import { InputBar } from './InputBar';
import { ConversationSidebar } from './ConversationSidebar';

export function ClawOverlay() {
  const {
    isOpen,
    viewMode,
    closeClaw,
    toggleViewMode,
    isSidebarOpen,
    toggleSidebar,
    startNewConversation,
    activeConversationId,
  } = useClawStore();

  // Slide-in animation state
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeClaw();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, closeClaw]);

  // Prevent body scroll only in overlay mode
  useEffect(() => {
    if (isOpen && viewMode === 'overlay') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, viewMode]);

  const handleExport = useCallback(() => {
    const { messages } = useClawStore.getState();
    if (!messages.length) return;

    const markdown = messages
      .map((m) => {
        const role = m.role === 'user' ? '**You**' : '**Brand Assistant**';
        return `${role}\n\n${m.content}\n`;
      })
      .join('\n---\n\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-conversation-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  if (!isOpen) return null;

  const isPanel = viewMode === 'panel';

  const containerClassName = isPanel
    ? `fixed right-0 top-0 bottom-0 z-50 flex flex-col w-[480px] bg-white border-l border-gray-200 shadow-2xl transition-transform duration-300 ease-in-out ${isVisible ? 'translate-x-0' : 'translate-x-full'}`
    : 'fixed inset-0 z-50 flex bg-white transition-all duration-300 ease-in-out';

  return (
    <div className={containerClassName}>
      {/* Conversation Sidebar — only in overlay mode */}
      {!isPanel && isSidebarOpen && (
        <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
          <ConversationSidebar />
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 h-14 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Sidebar toggle — only in overlay mode */}
            {!isPanel && (
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              >
                {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              </button>
            )}

            <button
              onClick={startNewConversation}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
              aria-label="New conversation"
            >
              <Plus size={18} />
            </button>

            <h1 className="text-sm font-semibold text-gray-900 ml-2">
              Brand Assistant
            </h1>
          </div>

          <div className="flex items-center gap-1">
            {activeConversationId && (
              <button
                onClick={handleExport}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                aria-label="Export conversation"
              >
                <Download size={18} />
              </button>
            )}

            <button
              onClick={toggleViewMode}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
              aria-label={isPanel ? 'Expand to full screen' : 'Collapse to panel'}
            >
              {isPanel ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
            </button>

            <button
              onClick={closeClaw}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Chat + Input */}
        <div className="flex-1 flex flex-col min-h-0">
          <ChatArea />
          <InputBar />
        </div>
      </div>
    </div>
  );
}
