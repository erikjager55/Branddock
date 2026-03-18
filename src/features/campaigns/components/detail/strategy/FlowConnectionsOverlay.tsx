"use client";

import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ResolvedFlowConnection } from "@/lib/campaigns/strategy-blueprint.types";

// ─── Constants ─────────────────────────────────────────────────

const CONNECTION_COLORS: Record<string, { stroke: string; fill: string; label: string }> = {
  sequence: { stroke: "#9ca3af", fill: "#9ca3af", label: "Sequence" },   // gray-400
  amplifies: { stroke: "#60a5fa", fill: "#60a5fa", label: "Amplifies" }, // blue-400
  retargets: { stroke: "#fbbf24", fill: "#fbbf24", label: "Retargets" }, // amber-400
};

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

// ─── Component ─────────────────────────────────────────────────

export function FlowConnectionsOverlay({
  connections,
  gridRef,
  zoom,
  visible,
  hiddenTitles,
  onHoverTitles,
}: FlowConnectionsOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [paths, setPaths] = useState<ComputedPath[]>([]);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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

  if (!visible || paths.length === 0) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none"
      width={svgSize.width}
      height={svgSize.height}
      style={{ overflow: "visible" }}
    >
      {/* Arrow markers */}
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
      </defs>

      {/* Connection paths */}
      {paths.map((item, idx) => {
        const colors = CONNECTION_COLORS[item.connection.connectionType] ?? CONNECTION_COLORS.sequence;
        const isHovered = hoveredIdx === idx;
        const isDashed = item.connection.connectionType === "retargets";

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
              stroke={colors.stroke}
              strokeWidth={isHovered ? 2.5 : 1.5}
              strokeDasharray={isDashed ? "6,4" : undefined}
              markerEnd={`url(#arrow-${item.connection.connectionType})`}
              opacity={isHovered ? 1 : 0.6}
              className="transition-opacity"
            />

            {/* Tooltip on hover */}
            {isHovered && (
              <foreignObject
                x={Math.min(item.fromRect.x, item.toRect.x) + Math.abs(item.toRect.x - item.fromRect.x) / 2 - 100}
                y={Math.min(item.fromRect.y, item.toRect.y) - ARC_HEIGHT - 36}
                width={200}
                height={36}
                className="pointer-events-none"
              >
                <div className="bg-gray-900 text-white text-[10px] rounded-md px-2.5 py-1.5 text-center shadow-lg whitespace-nowrap overflow-hidden text-ellipsis">
                  <span className="font-medium">{item.connection.fromTitle}</span>
                  <span className="text-gray-400 mx-1">→</span>
                  <span className="font-medium">{item.connection.toTitle}</span>
                  {item.connection.label && (
                    <span className="block text-gray-400 mt-0.5">{item.connection.label}</span>
                  )}
                  <span
                    className="inline-block ml-1 px-1 py-0 rounded text-[9px] font-medium"
                    style={{ backgroundColor: colors.fill, color: "#fff" }}
                  >
                    {colors.label}
                  </span>
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}
    </svg>
  );
}
