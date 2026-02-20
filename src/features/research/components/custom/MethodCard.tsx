"use client";

import React from "react";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { QuantityStepper } from "./QuantityStepper";

// ─── Types ───────────────────────────────────────────────────

interface MethodCardProps {
  type: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  confidence: string;
  quantity: number;
  onQuantityChange: (qty: number) => void;
}

// ─── Component ───────────────────────────────────────────────

export function MethodCard({
  type,
  name,
  description,
  price,
  unit,
  confidence,
  quantity,
  onQuantityChange,
}: MethodCardProps) {
  const maxQty = type === "WORKSHOP" ? 5 : 100;

  return (
    <div data-testid="method-card" className="bg-white rounded-lg border p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      {/* Left: info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900">{name}</span>
          <span className="text-sm font-semibold text-green-600">
            {price === 0 ? "FREE" : `$${price}/${unit}`}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-2">{description}</p>
        <ConfidenceBadge confidence={confidence} />
      </div>

      {/* Right: stepper */}
      <div className="flex-shrink-0">
        <QuantityStepper
          value={quantity}
          onChange={onQuantityChange}
          min={0}
          max={maxQty}
        />
      </div>
    </div>
  );
}
