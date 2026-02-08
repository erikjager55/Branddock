"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface Tab {
  label: string;
  value: string;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (value: string) => void;
  variant?: "underline" | "pills" | "enclosed";
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = "underline",
  className,
}: TabsProps) {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else {
      return;
    }
    const next = tabs[nextIndex];
    onChange(next.value);
    tabRefs.current.get(next.value)?.focus();
  };

  return (
    <div
      role="tablist"
      className={cn(
        "flex",
        variant === "underline" && "border-b border-border-dark gap-0",
        variant === "pills" && "gap-1",
        variant === "enclosed" &&
          "border border-border-dark rounded-lg p-1 bg-background-dark gap-0",
        className
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.value === activeTab;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.value, el);
            }}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "relative px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background-dark rounded-md",
              variant === "underline" && [
                "rounded-none pb-3",
                isActive ? "text-primary" : "text-text-dark/60 hover:text-text-dark",
              ],
              variant === "pills" && [
                isActive
                  ? "text-white"
                  : "text-text-dark/60 hover:text-text-dark hover:bg-surface-dark",
              ],
              variant === "enclosed" && [
                isActive
                  ? "text-text-dark"
                  : "text-text-dark/60 hover:text-text-dark",
              ]
            )}
          >
            {tab.label}
            {isActive && variant === "underline" && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            {isActive && variant === "pills" && (
              <motion.div
                layoutId="tab-pill"
                className="absolute inset-0 rounded-md bg-primary -z-10"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            {isActive && variant === "enclosed" && (
              <motion.div
                layoutId="tab-enclosed"
                className="absolute inset-0 rounded-md bg-surface-dark -z-10"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
