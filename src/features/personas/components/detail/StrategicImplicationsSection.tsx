'use client';

import { useState } from 'react';
import { TrendingUp, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import type { PersonaWithMeta, UpdatePersonaBody } from '../../types/persona.types';

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
    // Not JSON — legacy plain text
  }
  return null;
}

interface StrategicImplicationsSectionProps {
  persona: PersonaWithMeta;
  isEditing: boolean;
  onUpdate: (data: UpdatePersonaBody) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function StrategicImplicationsSection({
  persona,
  isEditing,
  onUpdate,
  onGenerate,
  isGenerating,
}: StrategicImplicationsSectionProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [draft, setDraft] = useState(persona.strategicImplications ?? '');

  const implications = parseImplications(persona.strategicImplications);
  const hasContent = !!persona.strategicImplications;

  const handleRerun = () => {
    setShowConfirm(false);
    onGenerate();
  };

  const handleBlur = () => {
    if (draft !== persona.strategicImplications) {
      onUpdate({ strategicImplications: draft });
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col">
      <div className="flex items-center mb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Strategic Implications</h2>
            <p className="text-sm text-gray-500">How this persona impacts decisions</p>
          </div>
        </div>
      </div>

      {/* Rerun confirmation dialog */}
      {showConfirm && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-800">
            Are you sure you want to regenerate strategic implications? This will overwrite the current implications.
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowConfirm(false)}
              className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRerun}
              className="text-sm text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex-1">
        {/* Loading state */}
        {isGenerating && (
          <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-6 text-center">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Generating strategic implications...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
          </div>
        )}

        {/* Structured implications list */}
        {!isGenerating && implications && (
          <div className="divide-y divide-border">
            {implications.map((impl, idx) => (
              <div key={idx} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  impl.priority === 'high' ? 'bg-emerald-500' :
                  impl.priority === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {impl.category}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      impl.priority === 'high' ? 'bg-emerald-100 text-emerald-700' :
                      impl.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {impl.priority}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-0.5">{impl.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{impl.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legacy plain text (old data or editing) */}
        {!isGenerating && hasContent && !implications && (
          isEditing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={handleBlur}
              rows={5}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
            />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {persona.strategicImplications}
            </p>
          )
        )}

        {/* Empty state */}
        {!isGenerating && !hasContent && (
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-6 text-center">
            <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No strategic implications defined yet</p>
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="mt-3 inline-flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              Generate with AI
            </button>
          </div>
        )}
      </div>

      {/* Footer — Rerun Analysis button */}
      {hasContent && !isGenerating && (
        <div className="flex justify-end mt-4 pt-3 border-t border-dashed border-border">
          <button
            onClick={() => setShowConfirm(true)}
            className="text-xs text-muted-foreground hover:text-emerald-600 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Rerun Analysis
          </button>
        </div>
      )}
    </section>
  );
}
