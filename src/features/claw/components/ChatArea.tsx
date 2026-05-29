'use client';

import React, { useRef, useEffect } from 'react';
import { Bot, User, Wrench, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { useClawStore } from '@/stores/useClawStore';
import { MutationConfirmCard } from './MutationConfirmCard';
import { BugReportForm } from './BugReportForm';
import { FeatureRequestForm } from './FeatureRequestForm';
import { FeedbackForm } from './FeedbackForm';
import { QuickContentForm } from './QuickContentForm';
import { MarkdownContent } from './MarkdownContent';
import { ReviewFindingsCard, type ReviewCardData } from './ReviewFindingsCard';
import { getQuickActions } from '@/lib/claw/quick-actions';
import type { ClawMessage, ClawQuickAction } from '@/lib/claw/claw.types';

export function ChatArea() {
  const {
    messages, streamingText, isStreaming, setInputText, pendingMutation,
    bugReportForm, featureRequestForm, feedbackForm, quickContentForm, activityStatus,
    currentPage, activeEntity, wizardSnapshot,
  } = useClawStore();

  // Context-aware quick actions — refreshes when the user navigates or the
  // wizard state changes so the suggestions always match what's on screen.
  const quickActions = React.useMemo(() => {
    const emptyCount = wizardSnapshot
      ? wizardSnapshot.fields.filter((f) => f.isEmpty).length
      : 0;
    return getQuickActions({
      activeSection: currentPage,
      activeEntityType: activeEntity?.type,
      activeEntityName: activeEntity?.name,
      hasWizardSnapshot: !!wizardSnapshot,
      wizardEmptyFieldCount: emptyCount,
      wizardName: wizardSnapshot?.name,
    });
  }, [currentPage, activeEntity, wizardSnapshot]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingText]);

  const hasMessages = messages.length > 0 || streamingText;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Empty state with quick actions */}
        {!hasMessages && (
          <EmptyState
            quickActions={quickActions}
            onSelectAction={setInputText}
            activeEntity={activeEntity}
            wizardSnapshot={wizardSnapshot}
          />
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming text */}
        {streamingText && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot size={14} className="text-teal-700" />
            </div>
            <div className="flex-1">
              <MarkdownContent content={streamingText} />
              <span className="inline-block w-1.5 h-4 bg-teal-500 ml-0.5 animate-pulse" />
            </div>
          </div>
        )}

        {/* Activity indicator — shown while the AI is thinking or running a tool
            and before any answer text has started streaming */}
        {isStreaming && !streamingText && (
          <ActivityIndicator label={activityStatus} />
        )}

        {/* Mutation confirmation card */}
        {pendingMutation && <MutationConfirmCard />}

        {/* Bug report form */}
        {bugReportForm && <BugReportForm />}

        {/* Feature request form */}
        {featureRequestForm && <FeatureRequestForm />}

        {/* Feedback form */}
        {feedbackForm && <FeedbackForm />}

        {/* Quick content form — opened by `/quick` or the TopNav button */}
        {quickContentForm && <QuickContentForm />}

        {/* Quick action follow-ups after last assistant message */}
        {!isStreaming && !pendingMutation && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && quickActions.length > 0 && (
          <QuickActionPills actions={quickActions} onSelect={setInputText} />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────

/** Live activity indicator shown between "user sent message" and "answer text arrives". */
function ActivityIndicator({ label }: { label: string | null }) {
  const text = label ?? 'Aan het nadenken';
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={14} className="text-teal-700" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100">
          <Loader2 size={12} className="text-teal-600 animate-spin flex-shrink-0" aria-hidden="true" />
          <span className="text-xs text-teal-700 font-medium">
            {text}
            <AnimatedEllipsis />
          </span>
        </div>
      </div>
    </div>
  );
}

function AnimatedEllipsis() {
  return (
    <span aria-hidden="true" className="inline-flex ml-0.5">
      <span className="animate-pulse" style={{ animationDelay: '0ms' }}>.</span>
      <span className="animate-pulse" style={{ animationDelay: '200ms' }}>.</span>
      <span className="animate-pulse" style={{ animationDelay: '400ms' }}>.</span>
    </span>
  );
}

function EmptyState({
  quickActions,
  onSelectAction,
  activeEntity,
  wizardSnapshot,
}: {
  quickActions: ClawQuickAction[];
  onSelectAction: (text: string) => void;
  activeEntity: { type: string; id: string; name: string } | null;
  wizardSnapshot: { name: string; fields: Array<{ isEmpty: boolean }> } | null;
}) {
  const defaultActions: ClawQuickAction[] = quickActions.length > 0 ? quickActions : [
    { label: 'Assess my brand foundation', prompt: 'Beoordeel mijn brand foundation — welke assets zijn goed ingevuld en waar is werk nodig?' },
    { label: 'Compare my personas', prompt: 'Vergelijk mijn personas op consistentie met mijn brand personality en archetype.' },
    { label: 'Suggest campaign strategy', prompt: 'Stel een campagnestrategie voor op basis van mijn huidige merk-data en trends.' },
    { label: 'What needs attention?', prompt: 'Wat heeft het meest urgent aandacht nodig in mijn workspace?' },
  ];

  // Proactive greeting: pick the best signal we have for context
  const greeting = resolveGreeting(activeEntity, wizardSnapshot);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mb-5">
        <Sparkles size={24} className="text-white" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{greeting.title}</h2>
      <p className="text-sm text-gray-500 mb-8 text-center max-w-md">
        {greeting.subtitle}
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
        {defaultActions.map((action, i) => (
          <button
            key={i}
            onClick={() => onSelectAction(action.prompt)}
            className="text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 transition-colors text-sm text-gray-700"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  brand_asset: 'brand asset',
  persona: 'persona',
  product: 'product',
  competitor: 'competitor',
};

/** Decide title + subtitle for the EmptyState based on available context. */
function resolveGreeting(
  activeEntity: { type: string; name: string } | null,
  wizardSnapshot: { name: string; fields: Array<{ isEmpty: boolean }> } | null,
): { title: string; subtitle: string } {
  // Wizard in progress — highest signal
  if (wizardSnapshot) {
    const emptyCount = wizardSnapshot.fields.filter((f) => f.isEmpty).length;
    if (emptyCount >= 3) {
      return {
        title: `Need help with your ${wizardSnapshot.name}?`,
        subtitle: `I can see ${emptyCount} empty fields. I can fill them in for you — you just confirm.`,
      };
    }
    return {
      title: `Working on your ${wizardSnapshot.name}`,
      subtitle: 'Ask me to refine any field, or I can review what you have so far.',
    };
  }

  // Detail page — I know which entity is active
  if (activeEntity) {
    const kindLabel = ENTITY_TYPE_LABELS[activeEntity.type] ?? activeEntity.type;
    return {
      title: `About ${activeEntity.name}`,
      subtitle: `I'm watching this ${kindLabel}. Ask me to fill empty fields, strengthen what's there, or compare it to the rest of your brand.`,
    };
  }

  // Workspace default
  return {
    title: 'Brand Assistant',
    subtitle: 'Your AI brand strategist. Ask questions, get advice, or let me update your brand data.',
  };
}

function MessageBubble({ message }: { message: ClawMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isUser ? 'bg-gray-200' : 'bg-teal-100'
        }`}
      >
        {isUser ? (
          <User size={14} className="text-gray-600" />
        ) : (
          <Bot size={14} className="text-teal-700" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isUser ? (
          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <MarkdownContent content={message.content} />
        )}

        {/* Tool results inline */}
        {message.toolResults?.map((tr) => {
          // Δ-1 Surface D — review_content krijgt een rijkere card via
          // clientAction marker. Andere analyze/read tools blijven de
          // generieke "Data retrieved successfully" badge.
          const result = tr.result as Record<string, unknown> | undefined;
          if (
            !tr.isError &&
            tr.toolName === 'review_content' &&
            result?.clientAction === 'review_findings_card'
          ) {
            return <ReviewFindingsCard key={tr.toolCallId} data={result as unknown as ReviewCardData} />;
          }

          return (
            <div
              key={tr.toolCallId}
              className={`mt-2 px-3 py-2 rounded-lg text-xs ${
                tr.isError ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {tr.isError ? (
                  <AlertCircle size={12} className="text-red-500" />
                ) : (
                  <Wrench size={12} className="text-gray-400" />
                )}
                <span className="font-medium">{tr.toolName}</span>
              </div>
              <div className="truncate">
                {tr.isError
                  ? String((tr.result as Record<string, unknown>)?.error ?? 'Error')
                  : 'Data retrieved successfully'}
              </div>
            </div>
          );
        })}

        {/* Attachments on user messages */}
        {isUser && message.attachments?.map((att) => (
          <div key={att.id} className="mt-2 px-3 py-1.5 rounded-lg bg-blue-50 text-xs text-blue-700 inline-flex items-center gap-1.5">
            {att.type === 'file' ? '📁' : att.type === 'url' ? '🔗' : '📄'}
            {att.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActionPills({
  actions,
  onSelect,
}: {
  actions: ClawQuickAction[];
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 pl-10">
      {actions.slice(0, 3).map((action, i) => (
        <button
          key={i}
          onClick={() => onSelect(action.prompt)}
          className="px-3 py-1.5 rounded-full text-xs border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50/50 transition-colors"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
