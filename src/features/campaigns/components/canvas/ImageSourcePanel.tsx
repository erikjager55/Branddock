'use client';

// =============================================================
// ImageSourcePanel — unified image-source flow voor canvas (F35).
//
// Voorheen drie image-touchpoints zonder slimme samenhang:
//  1. Step 1 VisualBriefSection — strategische source-choice
//  2. Step 2 VisualVariantsBlock — embedded executie (generate/compose/...)
//  3. Step 3 InsertImageModal — modal executie (library/upload/url/...)
//
// Deze component consolideert Step 2 + Step 3 in één tab-strip met
// alle 8 sources. Step 1 blijft strategische intent; Step 2/3 zijn
// nu views op dezelfde state.
//
// variant = 'embedded'  → inline op canvas (Step 2)
// variant = 'modal'     → binnen Modal-wrapper (Step 3)
//
// Default-tab volgt visualBrief.source (smart-default). Tab-clicks
// dispatchen onSourceChange — caller bepaalt of dit visualBrief.source
// updatet (Step 2 ja; Step 3 alleen lokale state).
// =============================================================

import React from 'react';
import {
  Wand2,
  Library,
  Upload,
  Link as LinkIcon,
  Images,
  Layers,
  Palette,
  Camera,
  Ban,
  Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { VisualBriefSource } from '@/lib/ai/canvas-context';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { LibraryTab } from './insert-image/LibraryTab';
import { UrlImportTab } from './insert-image/UrlImportTab';
import { StockPhotosTab } from './insert-image/StockPhotosTab';
import { SmartSearchTab } from './insert-image/SmartSearchTab';
import { GenerateImageTab } from './insert-image/GenerateImageTab';
import { UploadTab } from './insert-image/UploadTab';
import { LibraryAssetPicker } from './LibraryAssetPicker';
import { ComposePicker } from './ComposePicker';
import { TrainedStylePicker } from './TrainedStylePicker';
import { PhotographyBriefPanel } from './PhotographyBriefPanel';
import { SimilarAssetsRow } from './SimilarAssetsRow';
import { ModalityHint } from './ModalityHint';
import type { InsertImageSelection } from './insert-image/types';

interface SourceTab {
  value: VisualBriefSource;
  label: string;
  icon: LucideIcon;
}

export const IMAGE_SOURCE_TABS: SourceTab[] = [
  { value: 'smart-search', label: 'Smart search', icon: Search },
  { value: 'generate', label: 'Generate', icon: Wand2 },
  { value: 'library', label: 'Library', icon: Library },
  { value: 'upload', label: 'Upload', icon: Upload },
  { value: 'url', label: 'URL', icon: LinkIcon },
  { value: 'stock', label: 'Stock', icon: Images },
  { value: 'compose', label: 'Compose', icon: Layers },
  { value: 'trained-style', label: 'Trained', icon: Palette },
  { value: 'photography-request', label: 'Real photo', icon: Camera },
  { value: 'none', label: 'None', icon: Ban },
];

export interface ImageSourcePanelProps {
  deliverableId: string | null;
  /** Current active source — drives default tab. Caller controls. */
  source: VisualBriefSource;
  /** Called when user clicks a different tab. Caller decides whether to
   *  persist this back into visualBrief.source. */
  onSourceChange: (next: VisualBriefSource) => void;
  /** Rendering mode: 'embedded' for Step 2 inline; 'modal' for Step 3. */
  variant: 'embedded' | 'modal';
  /** For modal variant — fired when an image is selected/picked. */
  onSelected?: (selection: InsertImageSelection) => void;
  /** For modal variant — cancel/close button handler. */
  onCancel?: () => void;
  /** 'hero' in de LP-flow → compose/trained-pickers wiren hun beeld als hero. */
  target?: 'hero';
  /**
   * Optionele subset van bronnen — filtert de tab-strip. Gebruikt door het
   * Puck image-field (Layout editor) om dead-ends weg te laten (compose/
   * trained zijn niet modal-ready; photography-request/none leveren geen
   * selectie). Zonder deze prop blijven alle 10 tabs zichtbaar
   * (backward-compatible: InsertImageModal + Step 2 embedded ongewijzigd).
   */
  sources?: VisualBriefSource[];
}

export function ImageSourcePanel({
  deliverableId,
  source,
  onSourceChange,
  variant,
  onSelected,
  onCancel,
  target,
  sources,
}: ImageSourcePanelProps) {
  const isModal = variant === 'modal';
  const visibleTabs = sources
    ? IMAGE_SOURCE_TABS.filter((t) => sources.includes(t.value))
    : IMAGE_SOURCE_TABS;
  // Clamp: een actieve source buiten de subset zou content tonen van een tab
  // die niet bestaat in de strip — val defensief terug op de eerste zichtbare.
  const effectiveSource =
    sources && !sources.includes(source) && visibleTabs.length > 0
      ? visibleTabs[0].value
      : source;

  return (
    <div className={isModal ? '' : 'rounded-lg border border-gray-200 bg-white p-4'}>
      {/* Pattern G1 image-quality-chain — modality-fit hint per content-type.
          Niet-blokkerend; user mag elke source kiezen. */}
      <div className="mb-3">
        <ModalityHint />
      </div>
      {/* Tab-strip — sources horizontal (optioneel gefilterd via `sources`) */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-3 mb-4">
        {visibleTabs.map((t) => {
          const Icon = t.icon;
          const active = effectiveSource === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onSourceChange(t.value)}
              className={
                active
                  ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium'
                  : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-50 text-gray-600 text-xs font-medium hover:bg-gray-100'
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content per source */}
      <SourceContent
        deliverableId={deliverableId}
        source={effectiveSource}
        isModal={isModal}
        onSelected={onSelected}
        onCancel={onCancel}
        target={target}
      />
    </div>
  );
}

function SourceContent({
  deliverableId,
  source,
  isModal,
  onSelected,
  onCancel,
  target,
}: {
  deliverableId: string | null;
  source: VisualBriefSource;
  isModal: boolean;
  onSelected?: (selection: InsertImageSelection) => void;
  onCancel?: () => void;
  target?: 'hero';
}) {
  // F35 Stap 4: smart-default seeds uit visualBrief — briefingText voedt
  // search-input voor Stock + prompt-textarea voor Generate.
  const visualBrief = useCanvasStore((s) => s.visualBrief);
  const seedQuery = visualBrief.briefingText ?? '';
  const seedPrompt =
    [visualBrief.briefingText, visualBrief.styleDirectionFreeText]
      .filter(Boolean)
      .join(' — ') || undefined;

  // Modal-mode tabs use the existing onSelected callbacks
  if (isModal) {
    if (!onSelected) {
      return <div className="text-xs text-gray-500">No selection handler wired.</div>;
    }
    switch (source) {
      case 'smart-search':
        return <SmartSearchTab onSelected={onSelected} initialQuery={seedQuery} />;
      case 'generate':
        return <GenerateImageTab onSelected={onSelected} initialPrompt={seedPrompt} />;
      case 'library':
        return (
          <>
            <SimilarAssetsRow briefingText={seedQuery} onPick={onSelected} />
            <LibraryTab onSelected={onSelected} />
          </>
        );
      case 'upload':
        return <UploadTab onSelected={onSelected} />;
      case 'url':
        return <UrlImportTab onSelected={onSelected} />;
      case 'stock':
        return <StockPhotosTab onSelected={onSelected} initialQuery={seedQuery} />;
      case 'compose':
      case 'trained-style':
        // F35 phase 1: compose + trained-style nog niet modal-compatibel.
        // Hint user om Step 2 te gebruiken (embedded variant).
        return (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <strong>{source === 'compose' ? 'Compose' : 'Trained style'}</strong> is only available
            in Step 2 (Content Variants). Switch to that view to generate.
          </div>
        );
      case 'photography-request':
        return <PhotographyBriefPanel deliverableId={deliverableId} />;
      case 'none':
        return (
          <div className="text-xs text-gray-500 px-2 py-3">
            No visual for this content item. Switch sources above to add one.
          </div>
        );
    }
  }

  // Embedded-mode — Step 2 inline. Hier hebben we eigen pickers met
  // multi-select + grid-flow voor generate. onSelected wordt niet gebruikt;
  // sub-components muteren canvas-store direct.
  if (!deliverableId) {
    return <div className="text-xs text-gray-500">No deliverable loaded.</div>;
  }
  switch (source) {
    case 'smart-search':
      return onSelected ? (
        <SmartSearchTab onSelected={onSelected} initialQuery={seedQuery} />
      ) : (
        <div className="text-xs text-gray-500">Smart search via Step 3 (Medium).</div>
      );
    case 'generate':
      // Generate-flow zit nog in VisualVariantsBlock (button → orchestrator
      // → variant-grid). F35 Stap 3 verwijdert die en routet via deze
      // component naar GenerateImageTab. Voor nu: placeholder met instructie.
      return (
        <div className="text-xs text-gray-600 px-2 py-3">
          The generate flow is wired into the Step 2 main panel. Click the Generate button there.
        </div>
      );
    case 'library':
      return (
        <LibraryAssetPicker
          deliverableId={deliverableId}
          onCancel={onCancel}
          onPicked={onCancel}
          // LP/web-page-flow: laat de gekozen library-asset via het bewezen
          // onSelected→handleImageSelected-pad in puckData.hero landen (zoals
          // upload/url/stock). Zonder dit verscheen een library-pick niet in de LP.
          onHeroSelected={onSelected}
        />
      );
    case 'upload':
      // Modal-tab werkt ook in embedded — accepteert onSelected en gebruiker
      // kan beelden uploaden zonder modal-wrapper.
      return onSelected ? (
        <UploadTab onSelected={onSelected} />
      ) : (
        <div className="text-xs text-gray-500">Upload via Step 3 (Medium).</div>
      );
    case 'url':
      return onSelected ? (
        <UrlImportTab onSelected={onSelected} />
      ) : (
        <div className="text-xs text-gray-500">URL import via Step 3 (Medium).</div>
      );
    case 'stock':
      return onSelected ? (
        <StockPhotosTab onSelected={onSelected} initialQuery={seedQuery} />
      ) : (
        <div className="text-xs text-gray-500">Stock photos via Step 3 (Medium).</div>
      );
    case 'compose':
      return (
        <ComposePicker
          deliverableId={deliverableId}
          onCancel={onCancel}
          onGenerated={onCancel}
          target={target}
        />
      );
    case 'trained-style':
      return (
        <TrainedStylePicker
          deliverableId={deliverableId}
          onCancel={onCancel}
          onGenerated={onCancel}
          target={target}
        />
      );
    case 'photography-request':
      return <PhotographyBriefPanel deliverableId={deliverableId} />;
    case 'none':
      return (
        <div className="text-xs text-gray-500 px-2 py-3">
          No visual for this content item.
        </div>
      );
  }
}
