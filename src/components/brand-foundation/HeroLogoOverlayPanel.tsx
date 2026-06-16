'use client';

// =============================================================
// W5 logo L-Fase 3 (plan §5) — opt-in hero-logo-overlay toggle.
//
// Zet aan/uit of Branddock het ÉCHTE merklogo post-generatie op de
// hero-afbeelding stempelt (rechtsboven, licht/donker-variant op
// hoek-luminantie). Default uit: image-modellen hallucineren logo's,
// dus dit levert het juiste logo wanneer de user dat expliciet wil.
// API: GET / PUT /api/workspace/hero-logo-overlay.
// =============================================================

import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Stamp } from 'lucide-react';

export function HeroLogoOverlayPanel() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/workspace/hero-logo-overlay')
      .then((res) => (res.ok ? res.json() : { enabled: false }))
      .then((data: { enabled?: boolean }) => {
        if (!cancelled) setEnabled(Boolean(data.enabled));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Laden mislukt');
          setEnabled(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async () => {
    if (enabled === null || saving) return;
    const next = !enabled;
    setSaving(true);
    setError(null);
    // Optimistisch: schakelaar volgt direct; rollt terug bij fout.
    setEnabled(next);
    try {
      const res = await fetch('/api/workspace/hero-logo-overlay', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Opslaan mislukt (${res.status})`);
      }
      const data = (await res.json()) as { enabled?: boolean };
      setEnabled(Boolean(data.enabled));
    } catch (err) {
      setEnabled(!next); // rollback
      setError(err instanceof Error ? err.message : 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Stamp className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-900">Merklogo op hero-afbeelding</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Stempelt je échte logo rechtsboven op de gegenereerde hero-afbeelding (licht/donker-
            variant op basis van de achtergrond). AI-modellen verzinnen anders vervormde nep-logo&apos;s;
            laat dit uit als je liever helemaal geen logo op de foto wilt.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled === true}
          aria-label="Merklogo op hero-afbeelding"
          disabled={enabled === null || saving}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            enabled ? 'bg-purple-600' : 'bg-gray-300'
          }`}
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin text-white absolute left-1/2 -translate-x-1/2" />
          ) : (
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          )}
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-800">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <p className="mt-2 text-[11px] text-gray-400">
        Vereist minimaal één geüpload logo in je merkstijl. Geen logo? Dan wordt deze stap
        automatisch overgeslagen.
      </p>
    </div>
  );
}
