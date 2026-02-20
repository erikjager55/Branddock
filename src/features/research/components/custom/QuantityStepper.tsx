"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

interface QuantityStepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}

// ─── Component ───────────────────────────────────────────────

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 100,
}: QuantityStepperProps) {
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div data-testid="quantity-stepper" className="flex items-center border rounded-lg overflow-hidden">
      <button
        data-testid="stepper-decrease"
        type="button"
        onClick={() => !atMin && onChange(value - 1)}
        disabled={atMin}
        className={`w-8 h-8 flex items-center justify-center transition-colors ${
          atMin
            ? "text-gray-300 cursor-not-allowed"
            : "hover:bg-gray-100 text-gray-600"
        }`}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <div data-testid="stepper-value" className="w-10 h-8 flex items-center justify-center text-sm font-medium border-x">
        {value}
      </div>

      <button
        data-testid="stepper-increase"
        type="button"
        onClick={() => !atMax && onChange(value + 1)}
        disabled={atMax}
        className={`w-8 h-8 flex items-center justify-center transition-colors ${
          atMax
            ? "text-gray-300 cursor-not-allowed"
            : "hover:bg-gray-100 text-gray-600"
        }`}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
