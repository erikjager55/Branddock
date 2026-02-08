"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

export type DropdownEntry = DropdownItem | "separator";

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownEntry[];
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({
  trigger,
  items,
  align = "left",
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [flipUp, setFlipUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const actionItems = items.filter(
    (item): item is DropdownItem => item !== "separator"
  );

  const close = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [close]);

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setFlipUp(spaceBelow < 200);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlightedIndex(0);
        } else if (highlightedIndex >= 0) {
          actionItems[highlightedIndex]?.onClick?.();
          close();
        }
        break;
      case "Escape":
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((i) =>
            Math.min(i + 1, actionItems.length - 1)
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
    }
  };

  let actionIndex = -1;

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex", className)}
      onKeyDown={handleKeyDown}
    >
      <div onClick={() => setOpen(!open)}>{trigger}</div>

      {open && (
        <div
          ref={menuRef}
          className={cn(
            "absolute z-50 min-w-[180px] rounded-md border border-border-dark bg-surface-dark shadow-lg p-1",
            flipUp ? "bottom-full mb-1" : "top-full mt-1",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item, i) => {
            if (item === "separator") {
              return (
                <div
                  key={`sep-${i}`}
                  className="my-1 h-px bg-border-dark"
                />
              );
            }

            actionIndex++;
            const currentActionIndex = actionIndex;

            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  item.onClick?.();
                  close();
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors",
                  currentActionIndex === highlightedIndex &&
                    "bg-background-dark",
                  item.danger
                    ? "text-red-400 hover:bg-red-500/10"
                    : "text-text-dark hover:bg-background-dark"
                )}
              >
                {item.icon && (
                  <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>
                )}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
