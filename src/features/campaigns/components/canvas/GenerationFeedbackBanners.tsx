'use client';

// =============================================================
// GenerationFeedbackBanners — content-test improvements #1 + #7 + #8.
// Twee context-elementen in canvas:
//   1. BrandVoiceBanner — compact status-badge (voiceguide actief) of
//      duidelijker amber-banner bij fallback.
//   2. IterationNudgesPanel — quick-action chips na generation-complete,
//      gegroepeerd op intent met icoon per type.
// =============================================================

import { useState } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  Pencil,
  SlidersHorizontal,
  ArrowRight,
  ImagePlus,
  Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';

export function GenerationFeedbackBanners() {
  return (
    <>
      <BrandVoiceBanner />
      <IterationNudgesPanel />
    </>
  );
}

// ─── Brand-voice banner ────────────────────────────────────

function BrandVoiceBanner() {
  const status = useCanvasStore((s) => s.brandVoiceStatus);
  if (!status.level || !status.userMessage) return null;

  // Voiceguide actief = compact succes-badge; verkort de tekst zodat het
  // visueel niet concurreert met de iteration-nudges of canvas-content.
  if (!status.isFallback) {
    const shortLabel = SHORT_VOICE_LABELS[status.level ?? 'voiceguide'];
    return (
      <div className="mx-4 mt-3 mb-1 flex items-center" data-testid="brand-voice-banner">
        <div
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/70 border border-emerald-200/70 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700"
          title={status.userMessage}
        >
          <ShieldCheck className="w-3 h-3" />
          {shortLabel}
        </div>
      </div>
    );
  }

  // Fallback (no voiceguide / partial) — duidelijker amber-banner met tip,
  // omdat de user dit ECHT moet zien om kwaliteit te begrijpen.
  return (
    <div
      className="mx-4 mt-3 mb-1 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2"
      data-testid="brand-voice-banner-fallback"
    >
      <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
      <div className="text-xs text-amber-900 flex-1 leading-relaxed">
        {status.userMessage}
      </div>
    </div>
  );
}

const SHORT_VOICE_LABELS: Record<'voiceguide' | 'tone-only' | 'language-only' | 'none', string> = {
  voiceguide: 'Voiceguide actief',
  'tone-only': 'Tone-of-voice actief',
  'language-only': 'Alleen taal-instelling',
  none: 'Neutrale toon',
};

// ─── Iteration-nudges panel ────────────────────────────────

type NudgeGroup = 'refine' | 'derive' | 'enrich';

interface NudgeMeta {
  group: NudgeGroup;
  icon: LucideIcon;
}

// Map intent → group + icoon. Centrale bron zodat nieuwe intents
// (revise_keymessage etc.) hier eenvoudig in te passen zijn.
function classifyNudge(intent: string): NudgeMeta {
  switch (intent) {
    case 'revise_section':
      return { group: 'refine', icon: Pencil };
    case 'adjust_tone':
      return { group: 'refine', icon: SlidersHorizontal };
    case 'derive':
      return { group: 'derive', icon: ArrowRight };
    case 'add_image':
      return { group: 'enrich', icon: ImagePlus };
    default:
      return { group: 'refine', icon: Pencil };
  }
}

const GROUP_LABELS: Record<NudgeGroup, string> = {
  refine: 'Verfijnen',
  derive: 'Hergebruiken',
  enrich: 'Verrijken',
};

function IterationNudgesPanel() {
  const nudges = useCanvasStore((s) => s.iterationNudges);
  const globalStatus = useCanvasStore((s) => s.globalStatus);
  const deliverableId = useCanvasStore((s) => s.deliverableId);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (globalStatus !== 'complete' || nudges.length === 0) return null;

  async function handleNudgeClick(nudge: (typeof nudges)[number]) {
    if (nudge.intent !== 'derive' || !nudge.targetContentTypeId || !deliverableId) {
      return;
    }
    setBusyId(nudge.id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/studio/${deliverableId}/derive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetContentTypeId: nudge.targetContentTypeId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Derive failed: ${res.status}`);
      }
      const data = (await res.json()) as { newDeliverableId: string };
      window.location.href = `/?deliverableId=${data.newDeliverableId}`;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Derive mislukt');
      setBusyId(null);
    }
  }

  // Groepeer nudges per categorie — render in vaste volgorde refine -> derive -> enrich.
  const grouped: Record<NudgeGroup, Array<(typeof nudges)[number] & { icon: LucideIcon }>> = {
    refine: [],
    derive: [],
    enrich: [],
  };
  for (const n of nudges) {
    const meta = classifyNudge(n.intent);
    grouped[meta.group].push({ ...n, icon: meta.icon });
  }

  const renderOrder: NudgeGroup[] = ['refine', 'derive', 'enrich'];

  return (
    <div
      className="mx-4 my-3 rounded-xl bg-gradient-to-br from-teal-50/60 via-white to-emerald-50/40 border border-emerald-200/60 px-4 py-3 shadow-sm"
      data-testid="iteration-nudges-panel"
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/80 mb-2.5">
        Volgende stap
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {renderOrder.map((group) => {
          const items = grouped[group];
          if (items.length === 0) return null;
          return (
            <NudgeGroupRow
              key={group}
              label={GROUP_LABELS[group]}
              group={group}
              items={items}
              busyId={busyId}
              onClick={handleNudgeClick}
              deliverableId={deliverableId}
            />
          );
        })}
      </div>
      {errorMsg && (
        <div className="mt-2.5 text-[11px] text-red-700 flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" />
          {errorMsg}
        </div>
      )}
    </div>
  );
}

function NudgeGroupRow({
  label,
  group,
  items,
  busyId,
  onClick,
  deliverableId,
}: {
  label: string;
  group: NudgeGroup;
  items: Array<{
    id: string;
    label: string;
    intent: string;
    targetContentTypeId?: string;
    icon: LucideIcon;
  }>;
  busyId: string | null;
  onClick: (n: {
    id: string;
    label: string;
    intent: string;
    targetContentTypeId?: string;
  }) => void;
  deliverableId: string | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((n) => {
          const isBusy = busyId === n.id;
          const isDerive = group === 'derive' && !!n.targetContentTypeId;
          const isActionable = isDerive && !!deliverableId;
          const Icon = isBusy ? Loader2 : n.icon;
          return (
            <button
              key={n.id}
              type="button"
              data-intent={n.intent}
              onClick={() => onClick(n)}
              disabled={isBusy || (isDerive && !deliverableId)}
              title={
                isDerive
                  ? 'Maakt direct een nieuwe deliverable in dit type'
                  : 'Cue voor revisie-flow in de variant-panelen'
              }
              className={
                isActionable
                  ? // Derive — filled accent, signals "creates new"
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm'
                  : // Refine / enrich — ghost, signals "visual cue only"
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              }
            >
              <Icon className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
              {n.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
