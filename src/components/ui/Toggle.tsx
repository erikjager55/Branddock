"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const sizes = {
  sm: {
    track: "w-8 h-5",
    knob: "w-3.5 h-3.5",
    translate: 12,
    offset: 3,
  },
  md: {
    track: "w-11 h-6",
    knob: "w-4.5 h-4.5",
    translate: 20,
    offset: 2,
  },
};

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: keyof typeof sizes;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  size = "md",
  className,
}: ToggleProps) {
  const config = sizes[size];

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className
      )}
    >
      <button
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-dark",
          config.track,
          checked ? "bg-primary" : "bg-border-dark"
        )}
      >
        <motion.span
          className={cn(
            "absolute top-1/2 block rounded-full bg-white shadow-sm",
            config.knob
          )}
          initial={false}
          animate={{
            x: checked ? config.translate : config.offset,
            y: "-50%",
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
      {label && (
        <span className="text-sm text-text-dark">{label}</span>
      )}
    </label>
  );
}
