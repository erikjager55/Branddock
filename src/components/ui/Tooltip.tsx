"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

const positions = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

const arrowPositions = {
  top: "top-full left-1/2 -translate-x-1/2 border-t-slate-800 border-x-transparent border-b-transparent",
  bottom:
    "bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 border-x-transparent border-t-transparent",
  left: "left-full top-1/2 -translate-y-1/2 border-l-slate-800 border-y-transparent border-r-transparent",
  right:
    "right-full top-1/2 -translate-y-1/2 border-r-slate-800 border-y-transparent border-l-transparent",
};

export interface TooltipProps {
  content: React.ReactNode;
  side?: keyof typeof positions;
  delay?: number;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({
  content,
  side = "top",
  delay = 300,
  children,
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);

  return (
    <div className={cn("relative inline-flex", className)} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-50 whitespace-nowrap rounded-md bg-slate-800 px-3 py-1.5 text-xs text-white shadow-lg animate-in fade-in-0 zoom-in-95",
            positions[side]
          )}
        >
          {content}
          <span
            className={cn(
              "absolute border-[4px]",
              arrowPositions[side]
            )}
          />
        </div>
      )}
    </div>
  );
}
