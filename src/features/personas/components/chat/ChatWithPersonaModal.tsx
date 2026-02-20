'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Sparkles, Smile, Download, RefreshCw, MessageCircle, X } from 'lucide-react';
import { OptimizedImage } from '@/components/shared';
import type { PersonaWithMeta } from '../../types/persona.types';
import { usePersonaChat } from '../../hooks/usePersonaChat';
import { usePersonaChatStore } from '../../stores/usePersonaChatStore';
import { PersonaChatInterface } from './PersonaChatInterface';
import { PersonaChatInsightsTab } from './PersonaChatInsightsTab';
import { KnowledgeContextSelector } from './KnowledgeContextSelector';

interface ChatWithPersonaModalProps {
  persona: PersonaWithMeta;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatWithPersonaModal({ persona, isOpen, onClose }: ChatWithPersonaModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const activeTab = usePersonaChatStore((s) => s.activeTab);
  const setActiveTab = usePersonaChatStore((s) => s.setActiveTab);
  const isContextSelectorOpen = usePersonaChatStore((s) => s.isContextSelectorOpen);
  const openContextSelector = usePersonaChatStore((s) => s.openContextSelector);
  const closeContextSelector = usePersonaChatStore((s) => s.closeContextSelector);

  const chat = usePersonaChat(persona.id, isOpen);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('chat');
    }
  }, [isOpen, persona.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key closes modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const initials = persona.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Build subtitle: occupation + age range
  const subtitleParts: string[] = [];
  if (persona.occupation) subtitleParts.push(persona.occupation);
  if (persona.age) subtitleParts.push(persona.age);
  const headerSubtitle = subtitleParts.join(' \u2022 ');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
      >
        {/* Modal container */}
        <div
          className="bg-white max-w-2xl w-full h-[90vh] max-h-[90vh] shadow-2xl rounded-2xl flex flex-col mx-4 my-[5vh]"
          role="dialog"
          aria-modal="true"
          aria-label={`Chat with ${persona.name}`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <OptimizedImage
              src={persona.avatarUrl}
              alt={persona.name}
              width={48}
              height={48}
              className="rounded-full object-cover flex-shrink-0"
              fallback={
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {initials}
                </div>
              }
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{persona.name}</p>
              {headerSubtitle && (
                <p className="text-xs text-gray-500 truncate">{headerSubtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" aria-label="AI badge">
                <Sparkles className="w-5 h-5" />
              </button>
              <button className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" aria-label="Sentiment">
                <Smile className="w-5 h-5" />
              </button>
              <button className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" aria-label="Export">
                <Download className="w-5 h-5" />
              </button>
              <button className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" aria-label="Reset">
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div data-testid="persona-chat-tabs" className="flex px-6 border-b border-gray-100">
            <button
              data-testid="persona-chat-tab-chat"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 py-3 mr-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'chat'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Chat
              {chat.messageCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-teal-100 text-teal-700 rounded-full leading-none">
                  {chat.messageCount}
                </span>
              )}
            </button>
            <button
              data-testid="persona-chat-tab-insights"
              onClick={() => setActiveTab('insights')}
              className={`flex items-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'insights'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Insights
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' ? (
              <PersonaChatInterface
                persona={persona}
                chat={chat}
                onOpenContextSelector={openContextSelector}
              />
            ) : (
              <PersonaChatInsightsTab
                insights={chat.insights}
                onDeleteInsight={chat.deleteInsight}
                sessionId={chat.sessionId}
                personaName={persona.name}
              />
            )}
          </div>
        </div>
      </div>

      {/* Context selector modal (renders on top) */}
      <KnowledgeContextSelector
        personaId={persona.id}
        sessionId={chat.sessionId}
        isOpen={isContextSelectorOpen}
        onClose={closeContextSelector}
      />
    </>
  );
}
