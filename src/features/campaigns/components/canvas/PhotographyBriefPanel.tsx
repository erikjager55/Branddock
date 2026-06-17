'use client';

// =============================================================
// F42 (audit 2026-05-13): Photography-request flow.
// =============================================================
// Voor authenticity-critical content (case-studies, testimonials,
// locatie-content): AI genereert een fotograaf-briefing op basis
// van Visual Brief + brand-context. User kan briefing downloaden
// en aan een fotograaf geven. Na shoot: upload via Upload-source.
//
// Photography is NIET default — alleen wanneer user expliciet voor
// source 'photography-request' kiest in Step 1 of tab in Step 2.
// =============================================================

import React, { useState } from 'react';
import { Camera, Download, Loader2, AlertCircle, Wand2 } from 'lucide-react';

interface PhotographyBriefPanelProps {
  deliverableId: string | null;
}

export function PhotographyBriefPanel({ deliverableId }: PhotographyBriefPanelProps) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!deliverableId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/${deliverableId}/photo-brief`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Generation failed (${res.status})`);
      }
      const data = (await res.json()) as { markdown: string };
      setMarkdown(data.markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `photo-brief-${deliverableId ?? 'content'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
        <Camera className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-700" />
        <div>
          <p className="font-medium">Real photography workflow</p>
          <p className="mt-0.5">
            For authenticity-critical content (case studies, testimonials, location-specific)
            real photography converts better than AI stock.
            Branddock generates a brief for the photographer based on your
            Visual Brief + brand context.
            After the shoot: upload the photo via the Upload tab.
          </p>
        </div>
      </div>

      {!markdown && !busy && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!deliverableId || busy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium disabled:opacity-50"
        >
          <Wand2 className="h-4 w-4" />
          Generate photographer brief
        </button>
      )}

      {busy && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Brief is being drafted based on brand context...
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-800">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {markdown && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-700">Photographer brief</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-700"
              >
                <Download className="h-3 w-3" />
                Download .md
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={busy}
                className="text-xs text-amber-700 hover:text-amber-800 underline"
              >
                Regenerate
              </button>
            </div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
              {markdown}
            </pre>
          </div>
          <div className="rounded-md bg-blue-50 border border-blue-200 p-2.5 text-[11px] text-blue-900">
            Done with the shoot? Switch to the Upload tab to add the photo to this
            content item.
          </div>
        </div>
      )}
    </div>
  );
}
