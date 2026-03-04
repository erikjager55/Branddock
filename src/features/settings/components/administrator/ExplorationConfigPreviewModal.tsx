'use client';

import { useState } from 'react';
import {
  X,
  Bot,
  MessageCircle,
  User,
  Eye,
  LayoutGrid,
  Sparkles,
  Clock,
  Hash,
  Cpu,
} from 'lucide-react';

// ─── Dimension Colors ───────────────────────────────────────

const DIMENSION_COLORS = [
  { bg: '#f0fdfa', border: '#99f6e4', text: '#0f766e', badge: '#ccfbf1' },
  { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', badge: '#dbeafe' },
  { bg: '#fdf4ff', border: '#d8b4fe', text: '#7e22ce', badge: '#f3e8ff' },
  { bg: '#fff7ed', border: '#fdba74', text: '#c2410c', badge: '#ffedd5' },
  { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', badge: '#fee2e2' },
  { bg: '#f0fdf4', border: '#86efac', text: '#15803d', badge: '#dcfce7' },
  { bg: '#fefce8', border: '#fde047', text: '#a16207', badge: '#fef9c3' },
  { bg: '#f8fafc', border: '#94a3b8', text: '#475569', badge: '#e2e8f0' },
];

function getDimensionColor(index: number) {
  return DIMENSION_COLORS[index % DIMENSION_COLORS.length];
}

// ─── Types ──────────────────────────────────────────────────

interface PreviewDimension {
  key: string;
  title: string;
  question: string;
  followUpHint?: string;
  icon: string;
}

interface ExplorationConfigPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  configLabel: string;
  itemType: string;
  itemSubType: string | null;
  dimensions: PreviewDimension[];
  provider: string;
  model: string;
}

type PreviewMode = 'chat' | 'overview';

// ─── Component ──────────────────────────────────────────────

export function ExplorationConfigPreviewModal({
  isOpen,
  onClose,
  configLabel,
  itemType,
  itemSubType,
  dimensions,
  provider,
  model,
}: ExplorationConfigPreviewModalProps) {
  const [mode, setMode] = useState<PreviewMode>('chat');
  const [activeDimension, setActiveDimension] = useState(0);

  if (!isOpen) return null;

  const currentDim = dimensions[activeDimension];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '640px', maxHeight: '85vh' }}
      >
        {/* ─── Modal Header ────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #e5e7eb' }}
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Exploration Preview
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {configLabel}
              {itemSubType ? ` — ${itemSubType}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode Toggle */}
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid #e5e7eb' }}
            >
              <button
                onClick={() => setMode('chat')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: mode === 'chat' ? '#f0fdfa' : '#ffffff',
                  color: mode === 'chat' ? '#0d9488' : '#6b7280',
                }}
              >
                <MessageCircle className="w-3 h-3" />
                Chat Flow
              </button>
              <button
                onClick={() => setMode('overview')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: mode === 'overview' ? '#f0fdfa' : '#ffffff',
                  color: mode === 'overview' ? '#0d9488' : '#6b7280',
                  borderLeft: '1px solid #e5e7eb',
                }}
              >
                <LayoutGrid className="w-3 h-3" />
                Overview
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Progress Bar (clickable) ────────────────── */}
        <div
          className="px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}
        >
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-2">
            <span>Dimensions</span>
            <span>
              {activeDimension + 1} / {dimensions.length}
            </span>
          </div>
          <div className="flex gap-1">
            {dimensions.map((dim, i) => {
              const color = getDimensionColor(i);
              const isActive = i === activeDimension;
              const isPast = i < activeDimension;
              return (
                <button
                  key={dim.key || i}
                  onClick={() => setActiveDimension(i)}
                  className="flex-1 h-2 rounded-full transition-all"
                  style={{
                    backgroundColor: isActive
                      ? '#0d9488'
                      : isPast
                        ? color.border
                        : '#e5e7eb',
                    opacity: isActive ? 1 : isPast ? 0.8 : 0.5,
                  }}
                  title={dim.title || `Dimension ${i + 1}`}
                />
              );
            })}
          </div>
          {/* Dimension labels */}
          <div className="flex gap-1 mt-1.5">
            {dimensions.map((dim, i) => {
              const isActive = i === activeDimension;
              return (
                <button
                  key={`label-${dim.key || i}`}
                  onClick={() => setActiveDimension(i)}
                  className="flex-1 text-center truncate transition-colors"
                  style={{
                    fontSize: '9px',
                    color: isActive ? '#0d9488' : '#9ca3af',
                    fontWeight: isActive ? 600 : 400,
                  }}
                  title={dim.title}
                >
                  {dim.title || `Dim ${i + 1}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Body ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {mode === 'chat' ? (
            <ChatFlowPreview
              dimensions={dimensions}
              activeDimension={activeDimension}
              currentDim={currentDim}
            />
          ) : (
            <OverviewPreview
              dimensions={dimensions}
              configLabel={configLabel}
              itemType={itemType}
              provider={provider}
              model={model}
            />
          )}
        </div>

        {/* ─── Modal Footer ────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderTop: '1px solid #e5e7eb' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-[10px] font-medium rounded-full"
              style={{
                padding: '2px 8px',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
              }}
            >
              PREVIEW
            </span>
            <span className="text-[10px] text-gray-400">
              {dimensions.length} dimensions &middot; {provider}/{model.split('-').slice(0, 2).join('-')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 rounded-lg transition-colors"
            style={{ border: '1px solid #e5e7eb' }}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Chat Flow Preview ──────────────────────────────────────

function ChatFlowPreview({
  dimensions,
  activeDimension,
  currentDim,
}: {
  dimensions: PreviewDimension[];
  activeDimension: number;
  currentDim: PreviewDimension | undefined;
}) {
  if (!currentDim) {
    return (
      <div className="p-8 text-center text-sm text-gray-400">
        No dimensions configured yet.
      </div>
    );
  }

  const color = getDimensionColor(activeDimension);

  return (
    <div className="p-5 space-y-4">
      {/* Welcome message (shown for first dimension) */}
      {activeDimension === 0 && (
        <div className="flex gap-3">
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#f0fdfa' }}
          >
            <Bot className="w-4 h-4" style={{ color: '#0d9488' }} />
          </div>
          <div
            className="rounded-xl rounded-tl-none px-4 py-3"
            style={{ backgroundColor: '#f9fafb', maxWidth: '85%' }}
          >
            <p className="text-sm text-gray-700">
              Welcome! I&apos;ll guide you through{' '}
              <strong>{dimensions.length} strategic dimensions</strong> to
              explore and strengthen this asset. Let&apos;s begin with{' '}
              <strong>{currentDim.title || 'the first question'}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Dimension badge */}
      <div className="flex items-center gap-2 px-1">
        <span
          className="text-[10px] font-semibold rounded-full"
          style={{
            padding: '2px 10px',
            backgroundColor: color.badge,
            color: color.text,
          }}
        >
          {activeDimension + 1}/{dimensions.length}
        </span>
        <span className="text-xs font-medium text-gray-700">
          {currentDim.title || 'Untitled Dimension'}
        </span>
      </div>

      {/* AI Question bubble */}
      <div className="flex gap-3">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: color.bg, border: `1px solid ${color.border}` }}
        >
          <MessageCircle className="w-4 h-4" style={{ color: color.text }} />
        </div>
        <div
          className="rounded-xl rounded-tl-none px-4 py-3 flex-1"
          style={{
            backgroundColor: color.bg,
            border: `1px solid ${color.border}`,
            maxWidth: '85%',
          }}
        >
          <p className="text-sm text-gray-700">
            {currentDim.question || 'No question configured for this dimension.'}
          </p>
        </div>
      </div>

      {/* Simulated user answer */}
      <div className="flex gap-3 justify-end">
        <div
          className="rounded-xl rounded-tr-none px-4 py-3"
          style={{
            backgroundColor: '#f0fdfa',
            border: '1px solid #99f6e4',
            maxWidth: '75%',
          }}
        >
          <p className="text-xs text-gray-400 italic">
            User types their answer here...
          </p>
        </div>
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#f3f4f6' }}
        >
          <User className="w-4 h-4 text-gray-500" />
        </div>
      </div>

      {/* AI Feedback bubble */}
      <div className="flex gap-3">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#f0fdfa' }}
        >
          <Sparkles className="w-4 h-4" style={{ color: '#0d9488' }} />
        </div>
        <div
          className="rounded-xl rounded-tl-none px-4 py-3"
          style={{ backgroundColor: '#f9fafb', maxWidth: '85%' }}
        >
          <p className="text-xs text-gray-400 italic">
            AI provides constructive feedback on the answer...
          </p>
          {currentDim.followUpHint && (
            <p
              className="text-[10px] mt-2"
              style={{ color: '#9ca3af' }}
            >
              Follow-up hint: {currentDim.followUpHint}
            </p>
          )}
        </div>
      </div>

      {/* Navigation hint */}
      {activeDimension < dimensions.length - 1 && (
        <div
          className="text-center text-[10px] py-2"
          style={{ color: '#9ca3af' }}
        >
          Click dimension {activeDimension + 2} in the progress bar to preview
          the next question
        </div>
      )}
      {activeDimension === dimensions.length - 1 && (
        <div
          className="text-center text-[10px] py-2 font-medium"
          style={{ color: '#0d9488' }}
        >
          Final dimension — after this, the AI generates the exploration report
        </div>
      )}
    </div>
  );
}

// ─── Overview Preview ───────────────────────────────────────

function OverviewPreview({
  dimensions,
  configLabel,
  itemType,
  provider,
  model,
}: {
  dimensions: PreviewDimension[];
  configLabel: string;
  itemType: string;
  provider: string;
  model: string;
}) {
  if (dimensions.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-gray-400">
        No dimensions configured yet.
      </div>
    );
  }

  const hasQuestions = dimensions.filter((d) => d.question).length;
  const hasFollowUps = dimensions.filter((d) => d.followUpHint).length;

  return (
    <div className="p-5 space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatMini
          icon={<Hash className="w-3.5 h-3.5" />}
          label="Dimensions"
          value={String(dimensions.length)}
          color="#0d9488"
        />
        <StatMini
          icon={<MessageCircle className="w-3.5 h-3.5" />}
          label="Questions"
          value={`${hasQuestions}/${dimensions.length}`}
          color="#2563eb"
        />
        <StatMini
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="Follow-ups"
          value={String(hasFollowUps)}
          color="#7c3aed"
        />
        <StatMini
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Est. time"
          value={`${dimensions.length * 2}-${dimensions.length * 3}m`}
          color="#ea580c"
        />
      </div>

      {/* Config Info */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
        style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}
      >
        <Cpu className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-600">
          <strong>{configLabel}</strong> &middot; {itemType} &middot;{' '}
          {provider}/{model}
        </span>
      </div>

      {/* Dimension Cards */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Exploration Dimensions
        </h4>
        {dimensions.map((dim, i) => {
          const color = getDimensionColor(i);
          return (
            <div
              key={dim.key || i}
              className="rounded-lg overflow-hidden"
              style={{
                backgroundColor: color.bg,
                border: `1px solid ${color.border}`,
              }}
            >
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-bold rounded"
                      style={{
                        padding: '1px 6px',
                        backgroundColor: color.badge,
                        color: color.text,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: color.text }}
                    >
                      {dim.title || 'Untitled'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">
                    {dim.key}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {dim.question || (
                    <span className="text-gray-400 italic">
                      No question configured
                    </span>
                  )}
                </p>
                {dim.followUpHint && (
                  <p
                    className="text-[10px] mt-1.5"
                    style={{ color: '#9ca3af' }}
                  >
                    Follow-up: {dim.followUpHint}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Flow Summary */}
      <div
        className="rounded-lg px-4 py-3"
        style={{ backgroundColor: '#f0fdfa', border: '1px solid #99f6e4' }}
      >
        <div className="flex items-start gap-2">
          <Eye className="w-3.5 h-3.5 mt-0.5" style={{ color: '#0d9488' }} />
          <div>
            <p className="text-xs font-medium" style={{ color: '#0d9488' }}>
              User Experience Flow
            </p>
            <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
              Welcome message → {dimensions.length} dimension
              {dimensions.length !== 1 ? 's' : ''} with AI questions →
              User answers → AI feedback per dimension → Final exploration
              report with insights and field suggestions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Mini Card ─────────────────────────────────────────

function StatMini({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-lg px-3 py-2 text-center"
      style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}
    >
      <div
        className="flex items-center justify-center mb-1"
        style={{ color }}
      >
        {icon}
      </div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
      <div className="text-[10px] text-gray-400">{label}</div>
    </div>
  );
}
