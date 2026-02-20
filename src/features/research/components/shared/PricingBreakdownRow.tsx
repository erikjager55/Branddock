"use client";

import React from "react";

// ─── Types ───────────────────────────────────────────────────

interface PricingBreakdownRowProps {
  label: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// ─── Component ───────────────────────────────────────────────

export function PricingBreakdownRow({
  label,
  quantity,
  unitPrice,
  subtotal,
}: PricingBreakdownRowProps) {
  return (
    <div className="flex justify-between text-sm text-gray-600">
      <span>
        {label} x {quantity}
      </span>
      <span>{unitPrice === 0 ? "Free" : `$${subtotal.toLocaleString()}`}</span>
    </div>
  );
}
