"use client";

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ResolvedFlowConnection } from "@/lib/campaigns/strategy-blueprint.types";
import type { PersonaColorStyle } from "@/features/campaigns/lib/persona-colors";

// ─── Constants ─────────────────────────────────────────────────

const CONNECTION_COLORS: Record<string, { stroke: string; fill: string; label: string }> = {
  sequence: { stroke: "#9ca3af", fill: "#9ca3af", label: "Sequence" },   // gray-400
  amplifies: { stroke: "#60a5fa", fill: "#60a5fa", label: "Amplifies" }, // blue-400
  retargets: { stroke: "#fbbf24", fill: "#fbbf24", label: "Retargets" }, // amber-400
};

/** Default shared color for connections where both endpoints are shared */
const SHARED_HEX = "#6b7280"; // gray-500

const ARROW_SIZE = 6;
const ARC_HEIGHT = 40;

// ─── Types ─────────────────────────────────────────────────────

interface FlowConnectionsOverlayProps {
  connections: ResolvedFlowConnection[];
  /** Ref to the grid container (used for position calculations) */
  gridRef: React.RefObject<HTMLDivElement | null>;
  /** Current zoom level (CSS zoom percentage, e.g. 100) */
  zoom: number;
  /** Whether the overlay is visible */
  visible: boolean;
  /** Titles of deliverables that are currently hidden (filtered out) */
  hiddenTitles: Set<string>;
  /** Callback when a connection is hovered (highlights connected cards) */
  onHoverTitles?: (titles: Set<string> | null) => void;
  /** Persona color map (personaId → PersonaColorStyle) for persona-colored lines */
  personaColorMap?: Map<string, PersonaColorStyle>;
  /** Deliverable title → targetPersonas lookup for persona-colored lines */
  deliverablePersonaMap?: Map<string, string[]>;
  /** Persona name map (personaId → display name) for tooltip */
  personaNames?: Map<string, string>;
}

interface PathRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ComputedPath {
  connection: ResolvedFlowConnection;
  d: string;
  fromRect: PathRect;
  toRect: PathRect;
}

// ─── Helpers ───────────────────────────────────────────────────

/** Find the DOM element for a deliverable by data-flow-id attribute */
function findCardElement(gridEl: HTMLElement, title: string, beatIndex: number): HTMLElement | null {
  const escaped = CSS.escape(`${title}::${beatIndex}`);
  return gridEl.querySelector(`[data-flow-id="${escaped}"]`);
}

/** Compute the center-top position of an element relative to a container */
function getRelativeRect(el: HTMLElement, container: HTMLElement): PathRect {
  const elRect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    x: elRect.left - containerRect.left + elRect.width / 2,
    y: elRect.top - containerRect.top,
    width: elRect.width,
    height: elRect.height,
  };
}

/** Build a quadratic Bezier curve path for a connection */
function buildPath(from: PathRect, to: PathRect, sameBeat: boolean): string {
  const x1 = from.x;
  const y1 = from.y; // top of source card
  const x2 = to.x;
  const y2 = to.y; // top of target card

  if (sameBeat) {
    // S-curve for same-beat connections (vertical arc to the left)
    const cx = Math.min(x1, x2) - 30;
    const cy1 = y1 - ARC_HEIGHT * 0.3;
    const cy2 = y2 - ARC_HEIGHT * 0.3;
    return `M ${x1},${y1} C ${cx},${cy1} ${cx},${cy2} ${x2},${y2}`;
  }

  // Arc above cards
  const midX = (x1 + x2) / 2;
  const minY = Math.min(y1, y2);
  const arcY = minY - ARC_HEIGHT;

  return `M ${x1},${y1} Q ${midX},${arcY} ${x2},${y2}`;
}

/**
 * Resolve the persona color for a connection edge.
 * - Both endpoints share the same specific persona → that persona's activeHex
 * - One side is shared (empty targetPersonas), other is persona-specific → specific persona's color
 * - Both shared → SHARED_HEX
 * - Multiple shared personas → first shared persona's color
 */
function resolveEdgeColor(
  fromTitle: string,
  toTitle: string,
  deliverablePersonaMap: Map<string, string[]>,
  personaColorMap: Map<string, PersonaColorStyle>,
): string {
  const fromPersonas = deliverablePersonaMap.get(fromTitle) ?? [];
  const toPersonas = deliverablePersonaMap.get(toTitle) ?? [];

  const fromIsShared = fromPersonas.length === 0;
  const toIsShared = toPersonas.length === 0;

  // Both shared → gray
  if (fromIsShared && toIsShared) return SHARED_HEX;

  // One shared, one specific → use the specific persona's color
  if (fromIsShared && !toIsShared) {
    return personaColorMap.get(toPersonas[0])?.activeHex ?? SHARED_HEX;
  }
  if (toIsShared && !fromIsShared) {
    return personaColorMap.get(fromPersonas[0])?.activeHex ?? SHARED_HEX;
  }

  // Both specific — find shared personas between them
  const sharedPersonas = fromPersonas.filter((p) => toPersonas.includes(p));
  if (sharedPersonas.length > 0) {
    return personaColorMap.get(sharedPersonas[0])?.activeHex ?? SHARED_HEX;
  }

  // No overlap — use the from persona's color
  return personaColorMap.get(fromPersonas[0])?.activeHex ?? SHARED_HEX;
}

/** Resolve persona name(s) for a connection tooltip */
function resolveEdgePersonaLabel(
  fromTitle: string,
  toTitle: string,
  deliverablePersonaMap: Map<string, string[]>,
  personaNames: Map<string, string>,
): string | null {
  const fromPersonas = deliverablePersonaMap.get(fromTitle) ?? [];
  const toPersonas = deliverablePersonaMap.get(toTitle) ?? [];

  const fromIsShared = fromPersonas.length === 0;
  const toIsShared = toPersonas.length === 0;

  if (fromIsShared && toIsShared) return null;

  // Determine which persona(s) to show
  let relevantIds: string[];
  if (fromIsShared) {
    relevantIds = toPersonas;
  } else if (toIsShared) {
    relevantIds = fromPersonas;
  } else {
    const shared = fromPersonas.filter((p) => toPersonas.includes(p));
    relevantIds = shared.length > 0 ? shared : fromPersonas;
  }

  const names = relevantIds
    .map((id) => personaNames.get(id))
    .filter(Boolean)
    .slice(0, 2);

  return names.length > 0 ? names.join(", ") : null;
}

// ─── Component ─────────────────────────────────────────────────

export function FlowConnectionsOverlay({
  connections,
  gridRef,
  zoom,
  visible,
  hiddenTitles,
  onHoverTitles,
  personaColorMap,
  deliverablePersonaMap,
  personaNames,
}: FlowConnectionsOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [paths, setPaths] = useState<ComputedPath[]>([]);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const usePersonaColors = !!personaColorMap && !!deliverablePersonaMap;

  const computePaths = useCallback(() => {
    const gridEl = gridRef.current;
    if (!gridEl || connections.length === 0) {
      setPaths([]);
      return;
    }

    const zoomFactor = zoom / 100 || 1;
    const computed: ComputedPath[] = [];

    for (const conn of connections) {
      // Skip connections with hidden endpoints
      if (hiddenTitles.has(conn.fromTitle) || hiddenTitles.has(conn.toTitle)) continue;

      const fromEl = findCardElement(gridEl, conn.fromTitle, conn.fromBeatIndex);
      const toEl = findCardElement(gridEl, conn.toTitle, conn.toBeatIndex);
      if (!fromEl || !toEl) continue;

      const fromRect = getRelativeRect(fromEl, gridEl);
      const toRect = getRelativeRect(toEl, gridEl);

      // Adjust for CSS zoom
      const adjustedFrom = {
        x: fromRect.x / zoomFactor,
        y: fromRect.y / zoomFactor,
        width: fromRect.width / zoomFactor,
        height: fromRect.height / zoomFactor,
      };
      const adjustedTo = {
        x: toRect.x / zoomFactor,
        y: toRect.y / zoomFactor,
        width: toRect.width / zoomFactor,
        height: toRect.height / zoomFactor,
      };

      const sameBeat = conn.fromBeatIndex === conn.toBeatIndex;
      const d = buildPath(adjustedFrom, adjustedTo, sameBeat);

      computed.push({ connection: conn, d, fromRect: adjustedFrom, toRect: adjustedTo });
    }

    setPaths(computed);

    // Update SVG size to match grid
    const gridRect = gridEl.getBoundingClientRect();
    setSvgSize({
      width: gridRect.width / zoomFactor,
      height: gridRect.height / zoomFactor,
    });
  }, [connections, gridRef, zoom, hiddenTitles]);

  // Recompute on mount, resize, and dependency changes
  useLayoutEffect(() => {
    computePaths();

    const gridEl = gridRef.current;
    if (!gridEl) return;

    const observer = new ResizeObserver(computePaths);
    observer.observe(gridEl);

    return () => {
      observer.disconnect();
    };
  }, [computePaths, gridRef]);

  // Pre-compute per-edge colors and marker IDs for persona-colored mode
  const edgeColors = useMemo(() => {
    if (!usePersonaColors || !deliverablePersonaMap || !personaColorMap) return null;
    const colorMap = new Map<number, string>();
    paths.forEach((item, idx) => {
      const hex = resolveEdgeColor(
        item.connection.fromTitle,
        item.connection.toTitle,
        deliverablePersonaMap,
        personaColorMap,
      );
      colorMap.set(idx, hex);
    });
    return colorMap;
  }, [paths, usePersonaColors, deliverablePersonaMap, personaColorMap]);

  // Collect unique edge colors for dynamic markers
  const uniqueEdgeHexes = useMemo(() => {
    if (!edgeColors) return [];
    return Array.from(new Set(edgeColors.values()));
  }, [edgeColors]);

  if (!visible || paths.length === 0) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none"
      width={svgSize.width}
      height={svgSize.height}
      style={{ overflow: "visible" }}
    >
      {/* Arrow markers — per connection type (fallback) + per unique persona color */}
      <defs>
        {Object.entries(CONNECTION_COLORS).map(([type, colors]) => (
          <marker
            key={type}
            id={`arrow-${type}`}
            markerWidth={ARROW_SIZE}
            markerHeight={ARROW_SIZE}
            refX={ARROW_SIZE}
            refY={ARROW_SIZE / 2}
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path
              d={`M 0 0 L ${ARROW_SIZE} ${ARROW_SIZE / 2} L 0 ${ARROW_SIZE} Z`}
              fill={colors.fill}
            />
          </marker>
        ))}
        {/* Dynamic persona-colored markers */}
        {uniqueEdgeHexes.map((hex) => (
          <marker
            key={`persona-${hex}`}
            id={`arrow-persona-${hex.replace('#', '')}`}
            markerWidth={ARROW_SIZE}
            markerHeight={ARROW_SIZE}
            refX={ARROW_SIZE}
            refY={ARROW_SIZE / 2}
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path
              d={`M 0 0 L ${ARROW_SIZE} ${ARROW_SIZE / 2} L 0 ${ARROW_SIZE} Z`}
              fill={hex}
            />
          </marker>
        ))}
      </defs>

      {/* Connection paths */}
      {paths.map((item, idx) => {
        const fallbackColors = CONNECTION_COLORS[item.connection.connectionType] ?? CONNECTION_COLORS.sequence;
        const isHovered = hoveredIdx === idx;
        const isDashed = item.connection.connectionType === "retargets";

        // Resolve stroke color: persona-colored or fallback to connection type
        const edgeHex = edgeColors?.get(idx);
        const strokeColor = edgeHex ?? fallbackColors.stroke;
        const markerId = edgeHex
          ? `arrow-persona-${edgeHex.replace('#', '')}`
          : `arrow-${item.connection.connectionType}`;

        // Persona name for tooltip
        const personaLabel = deliverablePersonaMap && personaNames
          ? resolveEdgePersonaLabel(
              item.connection.fromTitle,
              item.connection.toTitle,
              deliverablePersonaMap,
              personaNames,
            )
          : null;

        return (
          <g key={`flow-${idx}`}>
            {/* Wider invisible hitbox for hover detection */}
            <path
              d={item.d}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              className="pointer-events-auto cursor-pointer"
              onMouseEnter={() => {
                setHoveredIdx(idx);
                onHoverTitles?.(new Set([item.connection.fromTitle, item.connection.toTitle]));
              }}
              onMouseLeave={() => {
                setHoveredIdx(null);
                onHoverTitles?.(null);
              }}
            />

            {/* Visible path */}
            <path
              d={item.d}
              fill="none"
              stroke={strokeColor}
              strokeWidth={isHovered ? 2.5 : 1.5}
              strokeDasharray={isDashed ? "6,4" : undefined}
              markerEnd={`url(#${markerId})`}
              opacity={isHovered ? 1 : 0.6}
              className="transition-opacity"
            />

            {/* Tooltip on hover */}
            {isHovered && (
              <foreignObject
                x={Math.min(item.fromRect.x, item.toRect.x) + Math.abs(item.toRect.x - item.fromRect.x) / 2 - 100}
                y={Math.min(item.fromRect.y, item.toRect.y) - ARC_HEIGHT - (personaLabel ? 48 : 36)}
                width={200}
                height={personaLabel ? 48 : 36}
                className="pointer-events-none"
              >
                <div className="bg-gray-900 text-white text-[10px] rounded-md px-2.5 py-1.5 text-center shadow-lg whitespace-nowrap overflow-hidden text-ellipsis">
                  <span className="font-medium">{item.connection.fromTitle}</span>
                  <span className="text-gray-400 mx-1">&rarr;</span>
                  <span className="font-medium">{item.connection.toTitle}</span>
                  {item.connection.label && (
                    <span className="block text-gray-400 mt-0.5">{item.connection.label}</span>
                  )}
                  <span
                    className="inline-block ml-1 px-1 py-0 rounded text-[9px] font-medium"
                    style={{ backgroundColor: strokeColor, color: "#fff" }}
                  >
                    {fallbackColors.label}
                  </span>
                  {personaLabel && (
                    <span className="block text-gray-300 mt-0.5 text-[9px]">{personaLabel}</span>
                  )}
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}
    </svg>
  );
}
