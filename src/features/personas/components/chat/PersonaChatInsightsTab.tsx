'use client';

import { Lightbulb, MessageCircle, Trash2, Download } from 'lucide-react';
import { Badge } from '@/components/shared';
import type { ChatInsight } from '../../types/persona-chat.types';
import { usePersonaChatStore } from '../../stores/usePersonaChatStore';

// ─── Insight type config ──────────────────────────────────

const INSIGHT_TYPE_CONFIG: Record<string, {
  label: string;
  dotColor: string;
  borderColor: string;
  bgColor: string;
  badgeVariant: 'danger' | 'success' | 'info' | 'warning' | 'default';
}> = {
  pain_point:  { label: 'Pain Point',  dotColor: 'bg-red-500',    borderColor: 'border-l-red-500',    bgColor: 'bg-red-50',    badgeVariant: 'danger' },
  opportunity: { label: 'Opportunity',  dotColor: 'bg-emerald-500', borderColor: 'border-l-emerald-500', bgColor: 'bg-emerald-50', badgeVariant: 'success' },
  preference:  { label: 'Preference',   dotColor: 'bg-blue-500',   borderColor: 'border-l-blue-500',   bgColor: 'bg-blue-50',   badgeVariant: 'info' },
  behavior:    { label: 'Behavior',     dotColor: 'bg-purple-500',  borderColor: 'border-l-purple-500',  bgColor: 'bg-purple-50',  badgeVariant: 'default' },
  need:        { label: 'Need',         dotColor: 'bg-orange-500',  borderColor: 'border-l-orange-500',  bgColor: 'bg-orange-50',  badgeVariant: 'warning' },
  objection:   { label: 'Objection',    dotColor: 'bg-red-500',    borderColor: 'border-l-red-500',    bgColor: 'bg-red-50',    badgeVariant: 'danger' },
  motivation:  { label: 'Motivation',   dotColor: 'bg-emerald-500', borderColor: 'border-l-emerald-500', bgColor: 'bg-emerald-50', badgeVariant: 'success' },
};

const SEVERITY_CONFIG: Record<string, { label: string; variant: 'danger' | 'warning' | 'default' }> = {
  high:   { label: 'High', variant: 'danger' },
  medium: { label: 'Medium', variant: 'warning' },
  low:    { label: 'Low', variant: 'default' },
};

// ─── Component ────────────────────────────────────────────

interface PersonaChatInsightsTabProps {
  insights: ChatInsight[];
  onDeleteInsight: (insightId: string) => void;
  sessionId: string | null;
  personaName: string;
}

export function PersonaChatInsightsTab({
  insights,
  onDeleteInsight,
  sessionId,
  personaName,
}: PersonaChatInsightsTabProps) {
  const setActiveTab = usePersonaChatStore((s) => s.setActiveTab);

  const insightList = insights;

  const handleViewInChat = (messageId: string | null) => {
    if (!messageId) return;
    setActiveTab('chat');
    // Scroll to message after tab switch
    setTimeout(() => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Flash highlight
        el.classList.add('ring-2', 'ring-amber-400', 'ring-offset-2', 'rounded-lg');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-amber-400', 'ring-offset-2', 'rounded-lg');
        }, 2000);
      }
    }, 100);
  };

  const handleDelete = (insightId: string) => {
    onDeleteInsight(insightId);
  };

  const handleExport = () => {
    const exportData = insightList.map((i) => ({
      type: i.type,
      title: i.title,
      content: i.content,
      severity: i.severity,
      createdAt: i.createdAt,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insights-${personaName.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (insightList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <Lightbulb className="w-10 h-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 text-center">
          Click the lightbulb icon on any assistant message to extract an insight
        </p>
        <p className="text-xs text-gray-400 text-center mt-1">
          Insights will appear here as you chat with {personaName.split(' ')[0]}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            Insights ({insightList.length})
          </h3>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Download className="w-3 h-3" />
          Export
        </button>
      </div>

      {/* Cards */}
      <div className="space-y-3 py-1 overflow-y-auto flex-1 px-1">
        {insightList.map((insight, index) => {
          const typeConfig = INSIGHT_TYPE_CONFIG[insight.type] || INSIGHT_TYPE_CONFIG.behavior;
          const severityConfig = insight.severity
            ? SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.medium
            : null;

          return (
            <div
              key={insight.id}
              className={`border border-gray-200 ${typeConfig.borderColor} border-l-4 rounded-lg overflow-hidden`}
            >
              {/* Header bar with number, type, severity */}
              <div className={`flex items-center gap-2 px-4 py-2 ${typeConfig.bgColor}`}>
                <span className="text-xs font-bold text-gray-500 min-w-[20px]">
                  #{index + 1}
                </span>
                <Badge variant={typeConfig.badgeVariant} size="sm">
                  {typeConfig.label}
                </Badge>
                {severityConfig && (
                  <Badge variant={severityConfig.variant} size="sm">
                    {severityConfig.label}
                  </Badge>
                )}
              </div>

              {/* Content */}
              <div className="px-4 py-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  {insight.title}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">{insight.content}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-50">
                {insight.messageId && (
                  <button
                    onClick={() => handleViewInChat(insight.messageId)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-teal-600 transition-colors"
                  >
                    <MessageCircle className="w-3 h-3" />
                    View in chat
                  </button>
                )}
                <button
                  onClick={() => handleDelete(insight.id)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
