'use client';

import { Lightbulb, MessageCircle, Trash2, Download } from 'lucide-react';
import type { ChatInsight } from '../../types/persona-chat.types';
import { usePersonaChatStore } from '../../stores/usePersonaChatStore';

// ─── Insight type config ──────────────────────────────────

const INSIGHT_TYPE_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  pdfColor: [number, number, number];
}> = {
  pain_point:  { label: 'Pain Point',  color: '#dc2626', bg: '#fef2f2', pdfColor: [220, 38, 38] },
  opportunity: { label: 'Opportunity', color: '#16a34a', bg: '#f0fdf4', pdfColor: [22, 163, 74] },
  preference:  { label: 'Preference',  color: '#2563eb', bg: '#eff6ff', pdfColor: [37, 99, 235] },
  behavior:    { label: 'Behavior',    color: '#9333ea', bg: '#faf5ff', pdfColor: [147, 51, 234] },
  need:        { label: 'Need',        color: '#ea580c', bg: '#fff7ed', pdfColor: [234, 88, 12] },
  objection:   { label: 'Objection',   color: '#dc2626', bg: '#fef2f2', pdfColor: [220, 38, 38] },
  motivation:  { label: 'Motivation',  color: '#ca8a04', bg: '#fefce8', pdfColor: [202, 138, 4] },
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

  const handleExport = async () => {
    // Dynamic import to avoid bundle bloat
    const { default: jsPDF } = await import('jspdf');

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Helper: add page break if needed
    const checkPageBreak = (needed: number) => {
      if (y + needed > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Persona Insights — ${personaName}`, margin, y);
    y += 10;

    // Subtitle
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`${insightList.length} insight${insightList.length !== 1 ? 's' : ''} · Exported ${new Date().toLocaleDateString('nl-NL')}`, margin, y);
    y += 12;

    // Separator line
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Insights
    insightList.forEach((insight, index) => {
      const typeConfig = INSIGHT_TYPE_CONFIG[insight.type] || INSIGHT_TYPE_CONFIG.behavior;
      const severityLabel = insight.severity
        ? (SEVERITY_CONFIG[insight.severity]?.label || 'Medium')
        : 'Medium';

      checkPageBreak(40);

      // Number + type + severity
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(150, 150, 150);
      doc.text(`#${index + 1}`, margin, y);

      doc.setTextColor(typeConfig.pdfColor[0], typeConfig.pdfColor[1], typeConfig.pdfColor[2]);
      doc.text(typeConfig.label, margin + 10, y);

      doc.setTextColor(150, 150, 150);
      doc.text(`· ${severityLabel}`, margin + 10 + doc.getTextWidth(typeConfig.label) + 3, y);
      y += 6;

      // Title
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      const titleLines = doc.splitTextToSize(insight.title, contentWidth);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 5 + 2;

      // Content
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const contentLines = doc.splitTextToSize(insight.content, contentWidth);
      checkPageBreak(contentLines.length * 4.5);
      doc.text(contentLines, margin, y);
      y += contentLines.length * 4.5 + 4;

      // Separator
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
    });

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text(
        `Branddock · Page ${i} of ${totalPages}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`insights-${personaName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  };

  if (insightList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-12">
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
    <div className="flex flex-col flex-1 overflow-hidden" style={{ overflow: 'hidden', minHeight: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 flex-shrink-0">
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
          Export PDF
        </button>
      </div>

      {/* Cards — scrollable */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3 pt-3" style={{ minHeight: 0 }}>
        {insightList.map((insight, index) => {
          const typeConfig = INSIGHT_TYPE_CONFIG[insight.type] || INSIGHT_TYPE_CONFIG.behavior;
          const severityConfig = insight.severity
            ? SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.medium
            : null;

          return (
            <div
              key={insight.id}
              className="rounded-xl border border-gray-100 overflow-hidden bg-white"
            >
              {/* Type + severity header */}
              <div
                className="flex items-center gap-3 px-4 py-2"
                style={{ backgroundColor: typeConfig.bg }}
              >
                <span className="text-xs font-bold text-gray-400 w-5">#{index + 1}</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: typeConfig.color }}
                  />
                  <span className="text-xs font-semibold" style={{ color: typeConfig.color }}>
                    {typeConfig.label}
                  </span>
                </div>
                {severityConfig && (
                  <span
                    className="text-xs font-medium ml-auto"
                    style={{
                      color: severityConfig.variant === 'danger' ? '#dc2626'
                        : severityConfig.variant === 'warning' ? '#d97706'
                        : '#6b7280'
                    }}
                  >
                    {severityConfig.label}
                  </span>
                )}
              </div>

              {/* Title + content */}
              <div className="px-4 py-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-1.5">{insight.title}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{insight.content}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-50 bg-gray-50/50">
                {insight.messageId && (
                  <button
                    onClick={() => handleViewInChat(insight.messageId)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-teal-600 transition-colors"
                  >
                    <MessageCircle className="w-3 h-3" />
                    View in chat
                  </button>
                )}
                <button
                  onClick={() => handleDelete(insight.id)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
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
