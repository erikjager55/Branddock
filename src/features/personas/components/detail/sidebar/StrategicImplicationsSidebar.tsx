'use client';

import { useState } from 'react';
import { TrendingUp, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import type { PersonaWithMeta, UpdatePersonaBody } from '../../../types/persona.types';

interface StrategicImplication {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

function parseImplications(raw: string | null): StrategicImplication[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].category) {
      return parsed;
    }
  } catch {
    // Not JSON - legacy plain text
  }
  return null;
}

interface StrategicImplicationsSidebarProps {
  persona: PersonaWithMeta;
  isEditing: boolean;
  onUpdate: (data: UpdatePersonaBody) => void;
  onGenerate?: () => void;
  isGenerating: boolean;
}

export function StrategicImplicationsSidebar({
  persona,
  isEditing,
  onUpdate,
  onGenerate,
  isGenerating,
}: StrategicImplicationsSidebarProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [draft, setDraft] = useState(persona.strategicImplications ?? '');

  const implications = parseImplications(persona.strategicImplications);
  const hasContent = !!persona.strategicImplications;

  const handleRerun = () => {
    setShowConfirm(false);
    onGenerate?.();
  };

  const handleBlur = () => {
    if (draft !== persona.strategicImplications) {
      onUpdate({ strategicImplications: draft });
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">Strategic Implications</h3>
          <p className="text-[10px] text-gray-500">How this persona impacts decisions</p>
        </div>
      </div>

      {/* Rerun confirmation */}
      {showConfirm && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-800 mb-2">Regenerate? This overwrites current data.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRerun}
              className="text-xs text-white bg-amber-500 hover:bg-amber-600 px-2 py-1 rounded transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isGenerating && (
        <div className="py-6 text-center">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">Generating...</p>
        </div>
      )}

      {/* Structured implications */}
      {!isGenerating && implications && (
        <div className="space-y-2.5">
          {implications.slice(0, 4).map((impl, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                impl.priority === 'high' ? 'bg-emerald-500' :
                impl.priority === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 leading-snug">{impl.title}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{impl.description}</p>
              </div>
            </div>
          ))}
          {implications.length > 4 && (
            <p className="text-[10px] text-gray-400 text-center">+{implications.length - 4} more</p>
          )}
        </div>
      )}

      {/* Legacy plain text */}
      {!isGenerating && hasContent && !implications && (
        isEditing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            rows={4}
            className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
          />
        ) : (
          <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed line-clamp-6">
            {persona.strategicImplications}
          </p>
        )
      )}

      {/* Empty state — hidden when locked (onGenerate undefined) */}
      {!isGenerating && !hasContent && onGenerate && (
        <div className="py-4 text-center">
          <Sparkles className="w-6 h-6 text-blue-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400 mb-2">No implications yet</p>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3" />
            Generate with AI
          </button>
        </div>
      )}

      {/* Rerun footer — hidden when locked (onGenerate undefined) */}
      {hasContent && !isGenerating && onGenerate && (
        <div className="flex justify-end mt-3 pt-2.5 border-t border-dashed border-gray-200">
          <button
            onClick={() => setShowConfirm(true)}
            className="text-[10px] text-gray-400 hover:text-emerald-600 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            Rerun
          </button>
        </div>
      )}
    </div>
  );
}
