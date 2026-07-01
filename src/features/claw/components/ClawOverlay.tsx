'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, PanelLeftClose, PanelLeftOpen, Download, Maximize2, Minimize2, RefreshCw, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useClawStore } from '@/stores/useClawStore';
import { ChatArea } from './ChatArea';
import { InputBar } from './InputBar';
import { ConversationSidebar } from './ConversationSidebar';

export function ClawOverlay() {
  const { t } = useTranslation('claw');
  const {
    isOpen,
    viewMode,
    closeClaw,
    toggleViewMode,
    isSidebarOpen,
    toggleSidebar,
    startNewConversation,
    activeConversationId,
    activeEntity,
    wizardSnapshot,
    isHistoryPopoverOpen,
    toggleHistoryPopover,
    closeHistoryPopover,
  } = useClawStore();

  // Short "watching" label shown under the title when Claw has real page context.
  const watchingLabel = (() => {
    if (activeEntity) return activeEntity.name;
    if (wizardSnapshot) return wizardSnapshot.name;
    return null;
  })();

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
        const role =
          m.role === 'user' ? `**${t('overlay.exportYou')}**` : `**${t('assistantName')}**`;
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
  }, [t]);

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
      <div className="flex-1 flex flex-col min-w-0" style={{ minHeight: 0 }}>
        {/* Header */}
        <header className="flex items-center justify-between px-4 h-14 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Sidebar toggle — overlay mode gets the full collapse toggle */}
            {!isPanel && (
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                aria-label={isSidebarOpen ? t('overlay.hideSidebar') : t('overlay.showSidebar')}
              >
                {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              </button>
            )}
            {/* Panel mode shows a History popover trigger instead */}
            {isPanel && (
              <button
                onClick={toggleHistoryPopover}
                className={`p-1.5 rounded-md transition-colors ${
                  isHistoryPopoverOpen ? 'bg-teal-50 text-teal-700' : 'hover:bg-gray-100 text-gray-500'
                }`}
                aria-label={t('overlay.conversationHistory')}
                title={t('overlay.conversationHistory')}
              >
                <History size={18} />
              </button>
            )}

            <div className="ml-2 flex flex-col min-w-0">
              <h1 className="text-sm font-semibold text-gray-900 leading-tight">
                {t('assistantName')}
              </h1>
              {watchingLabel && (
                <span className="text-[11px] text-gray-500 leading-tight truncate" title={watchingLabel}>
                  {t('overlay.watching')}{' '}
                  <span className="text-teal-700 font-medium">{watchingLabel}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Start new conversation — prominent circular button */}
            <button
              onClick={startNewConversation}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors mr-1"
              aria-label={t('overlay.newConversationAria')}
              title={t('overlay.newConversationTitle')}
            >
              <RefreshCw size={16} strokeWidth={2} />
            </button>

            {activeConversationId && (
              <button
                onClick={handleExport}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                aria-label={t('overlay.exportConversation')}
              >
                <Download size={18} />
              </button>
            )}

            <button
              onClick={toggleViewMode}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
              aria-label={isPanel ? t('overlay.expandFullScreen') : t('overlay.collapseToPanel')}
            >
              {isPanel ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
            </button>

            <button
              onClick={closeClaw}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
              aria-label={t('overlay.close')}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Chat + Input */}
        <div className="flex-1 flex flex-col relative" style={{ minHeight: 0 }}>
          <ChatArea />
          <InputBar />

          {/* History popover — only in panel mode */}
          {isPanel && isHistoryPopoverOpen && (
            <>
              <div
                className="absolute inset-0 bg-black/20 z-10"
                onClick={closeHistoryPopover}
                aria-hidden="true"
              />
              <div className="absolute left-2 top-2 bottom-2 w-72 bg-gray-50 border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('overlay.history')}</span>
                  <button
                    onClick={closeHistoryPopover}
                    className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
                    aria-label={t('overlay.closeHistory')}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="h-[calc(100%-41px)]">
                  <ConversationSidebar />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
