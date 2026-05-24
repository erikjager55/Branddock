'use client';

import { useMemo } from 'react';
import { Render, type Data } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { Globe } from 'lucide-react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import {
  buildSpikePuckConfig,
  type SpikePuckProps,
} from '../medium/puck-config';
import { variantToPuckData } from '../medium/variant-to-puck-data';

type SpikeData = Data<SpikePuckProps>;

/**
 * Phase 6.4a (2026-05-24) — mini Puck.Preview voor Step 2 ContentVariants
 * voor de 5 web-page types (landing-page / product-page / faq-page /
 * comparison-page / microsite).
 *
 * Vervangt de legacy `LandingPagePreview` (plain-text rendering van variant-
 * content) door een gestylde mini-thumbnail die laat zien hoe de variant er
 * uiteindelijk in Step 3 als gerenderde page uitziet. Helpt de gebruiker
 * Variant A vs B vergelijken op visueel niveau, niet alleen tekstueel.
 *
 * Mini-rendering:
 *  - Volledige `<Render>` van de page met brand-tokens (zelfde config als
 *    Step 3 PuckPageBuilder)
 *  - Scale-down via CSS transform zodat het in de Step 2-card-grid past
 *  - Pointer-events disabled: variant-preview is read-only, edits horen
 *    in Step 3
 *  - Fade-overlay onderaan met "Volledig zichtbaar in Stap 3" hint
 *
 * Data-flow: gebruikt dezelfde `variantToPuckData()` mapper als Step 3,
 * dus de Step 2 mini-preview matcht 1:1 wat de gebruiker in Step 3 als
 * initial puckData ziet — geen verrassingen na doorklik.
 */
export function LandingPageVariantPreview({
  previewContent,
  isGenerating,
}: PlatformPreviewProps) {
  const contextStack = useCanvasStore((s) => s.contextStack);

  const config = useMemo(() => buildSpikePuckConfig(contextStack), [contextStack]);
  const puckData = useMemo<SpikeData>(
    () => variantToPuckData(previewContent, contextStack),
    [previewContent, contextStack],
  );

  if (isGenerating) {
    return (
      <div
        style={{
          height: 320,
          border: '1px dashed #cbd5e1',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: 13,
          gap: 8,
        }}
      >
        <Globe size={18} />
        Page-preview verschijnt zodra variants gegenereerd zijn
      </div>
    );
  }

  if (puckData.content.length === 0) {
    return (
      <div
        style={{
          height: 320,
          border: '1px dashed #cbd5e1',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: 13,
          gap: 8,
        }}
      >
        <Globe size={18} />
        <p style={{ margin: 0 }}>Geen variant-content om te previewen</p>
        <p style={{ margin: 0, fontSize: 11 }}>Genereer eerst content in Stap 2</p>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#ffffff',
        height: 480,
      }}
    >
      {/* Scale-down container — laat een 1280px-brede page in een ~480px
          tall card passen door 0.5x te schalen. Origin top-left zodat de
          page bovenaan blijft hangen ipv gecentreerd uit beeld te lopen. */}
      <div
        style={{
          width: '200%',
          transform: 'scale(0.5)',
          transformOrigin: 'top left',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
        aria-label="Mini page-preview — volledige editor in Stap 3"
      >
        <Render config={config} data={puckData} />
      </div>

      {/* Fade-overlay onderaan met hint dat dit alleen een preview is —
          de echte editor leeft in Step 3. Voorkomt dat de user denkt dat
          dit een halve render is. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '32px 12px 10px',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 60%, #ffffff 100%)',
          textAlign: 'center',
          fontSize: 11,
          color: '#64748b',
          fontStyle: 'italic',
        }}
      >
        Mini-preview — volledig bewerkbaar in Stap 3 (Medium)
      </div>
    </div>
  );
}
